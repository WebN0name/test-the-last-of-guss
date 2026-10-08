import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Round } from '../../src/domain/round/entities/round';
import { scoreFor } from '../../src/domain/score/services/scoring-rule';
import { STANDINGS_LIMIT } from '../../src/domain/score/value-objects/standing';
import { User } from '../../src/domain/user/entities/user';
import { TypeOrmRoundRepository } from '../../src/infrastructure/database/repositories/typeorm-round.repository';
import { TypeOrmScoreRepository } from '../../src/infrastructure/database/repositories/typeorm-score.repository';
import { TypeOrmUserRepository } from '../../src/infrastructure/database/repositories/typeorm-user.repository';
import { createTestDataSource, truncateAll } from './setup/test-db';

describe('TypeOrmScoreRepository', () => {
  let ds: DataSource;
  let scores: TypeOrmScoreRepository;
  let rounds: TypeOrmRoundRepository;
  let users: TypeOrmUserRepository;
  const GRACE = 2;
  const MAX_TPS = 20;

  const insertRound = async (startOffsetSec: number, durationSec: number, creatorId: string): Promise<Round> => {
    const now = new Date();
    const startAt = new Date(now.getTime() + startOffsetSec * 1000);
    const round = Round.restore({
      id: randomUUID(),
      creatorId,
      startAt,
      endAt: new Date(startAt.getTime() + durationSec * 1000),
      totalScore: 0,
      createdAt: new Date(Math.min(startAt.getTime(), now.getTime()) - 1000),
    });
    await rounds.insert(round);
    return round;
  };

  const insertUser = async (login: string, id: string = randomUUID()): Promise<string> => {
    await users.insert(User.create({ id, login, passwordHash: 'h', now: new Date() }));
    return id;
  };

  const winnerOf = async (roundId: string, userId: string) => (await scores.findTally(roundId, userId))?.winner;

  const tap = (roundId: string, userId: string, count: number) =>
    scores.applyTaps({ roundId, userId, count, graceSec: GRACE, maxTps: MAX_TPS });

  beforeAll(async () => {
    ds = await createTestDataSource();
    scores = new TypeOrmScoreRepository(ds);
    rounds = new TypeOrmRoundRepository(ds);
    users = new TypeOrmUserRepository(ds);
  });

  beforeEach(async () => {
    await truncateAll(ds);
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('первый тап создаёт запись, следующие накапливают, бонус на 11-м', async () => {
    const u = await insertUser('p1');
    const round = await insertRound(-60, 3600, u);
    for (let i = 1; i <= 10; i++) expect((await tap(round.id, u, 1))?.score).toBe(i);
    const eleventh = await tap(round.id, u, 1);
    expect(eleventh).toEqual(expect.objectContaining({ taps: 11, score: 20 }));
  });

  it('параллельные батчи трёх игроков сходятся с формулой и total_score', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const players = await Promise.all(['p1', 'p2', 'p3'].map((l) => insertUser(l)));
    const plan = new Map<string, number[]>();
    const jobs: (() => Promise<unknown>)[] = [];
    for (const p of players) {
      const batches: number[] = [];
      let left = 100 + Math.floor(Math.random() * 60);
      while (left > 0) {
        const c = Math.min(left, 1 + Math.floor(Math.random() * 5));
        batches.push(c);
        left -= c;
      }
      plan.set(p, batches);
      for (const c of batches) jobs.push(() => tap(round.id, p, c));
    }
    const shuffled = [...jobs].sort(() => Math.random() - 0.5);
    await Promise.all(shuffled.map((job) => job()));

    let sum = 0;
    for (const p of players) {
      const sent = plan.get(p)!.reduce((a, b) => a + b, 0);
      const mine = await scores.findMine(round.id, p);
      expect(mine?.taps).toBe(sent);
      expect(mine?.score).toBe(scoreFor(sent));
      sum += scoreFor(sent);
    }
    const stored = await rounds.findById(round.id);
    expect(stored?.totalScore).toBe(sum);
  });

  it('до старта, после end_at + grace, в несуществующий — null и ничего не записано', async () => {
    const u = await insertUser('p');
    const future = await insertRound(60, 60, u);
    const past = await insertRound(-120, 60, u);
    expect(await tap(future.id, u, 1)).toBeNull();
    expect(await tap(past.id, u, 1)).toBeNull();
    expect(await tap(randomUUID(), u, 1)).toBeNull();
    expect(await scores.findMine(future.id, u)).toBeNull();
    expect((await rounds.findById(past.id))?.totalScore).toBe(0);
  });

  it('в grace-окне тап принимается', async () => {
    const u = await insertUser('p');
    const endedFiveSecAgo = await insertRound(-65, 60, u);
    const inGrace = await scores.applyTaps({
      roundId: endedFiveSecAgo.id,
      userId: u,
      count: 3,
      graceSec: 10,
      maxTps: MAX_TPS,
    });
    expect(inGrace?.score).toBe(3);
    expect(await tap(endedFiveSecAgo.id, u, 1)).toBeNull();
  });

  it('потолок MAX_TPS отбивает и insert, и update', async () => {
    const u1 = await insertUser('p1');
    const u2 = await insertUser('p2');
    const minuteOld = await insertRound(-60, 3600, u1);
    const capped = (count: number, userId: string) =>
      scores.applyTaps({ roundId: minuteOld.id, userId, count, graceSec: GRACE, maxTps: 1 });
    expect(await capped(20, u1)).toEqual(expect.objectContaining({ taps: 20, score: scoreFor(20) }));
    expect((await capped(20, u1))?.taps).toBe(40);
    expect(await capped(25, u1)).toBeNull();
    expect(await capped(25, u1)).toBeNull();
    expect(await capped(70, u2)).toBeNull();
    const total = (await rounds.findById(minuteOld.id))?.totalScore;
    expect(total).toBe(scoreFor(40));
    expect((await scores.findMine(minuteOld.id, u1))?.score).toBe(total);
  });

  it('победитель: максимум очков, при равенстве — кто раньше, при нуле — null', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const [p1, p2, p3] = await Promise.all(['p1', 'p2', 'p3'].map((l) => insertUser(l)));
    expect(await winnerOf(round.id, admin)).toBeNull();

    await ds.query(
      `INSERT INTO scores (round_id, user_id, taps, score, updated_at) VALUES
        ($1, $2, 5, 5, now() - interval '10 s'),
        ($1, $3, 5, 5, now() - interval '20 s'),
        ($1, $4, 2, 2, now())`,
      [round.id, p1, p2, p3],
    );
    const winner = await winnerOf(round.id, admin);
    expect(winner?.userId).toBe(p2);
    expect(winner?.login).toBe('p2');
    expect(winner?.score).toBe(5);
  });

  it('полная ничья по очкам и времени: побеждает меньший user_id', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const big = await insertUser('big', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const small = await insertUser('small', '00000000-0000-4000-8000-000000000001');
    await ds.query(
      `INSERT INTO scores (round_id, user_id, taps, score, updated_at) VALUES
        ($1, $2, 5, 5, '2026-10-07T10:00:00Z'),
        ($1, $3, 5, 5, '2026-10-07T10:00:00Z')`,
      [round.id, big, small],
    );
    expect((await winnerOf(round.id, admin))?.userId).toBe(small);
  });

  it('findTally: total, победитель и мои очки одним снимком', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const [p1, p2] = await Promise.all(['p1', 'p2'].map((l) => insertUser(l)));
    await tap(round.id, p1, 12);
    await tap(round.id, p2, 3);
    const tally = await scores.findTally(round.id, p2);
    expect(tally).toEqual({
      total: scoreFor(12) + scoreFor(3),
      winner: { userId: p1, login: 'p1', score: scoreFor(12) },
      standings: [
        { place: 1, userId: p1, login: 'p1', score: scoreFor(12) },
        { place: 2, userId: p2, login: 'p2', score: 3 },
      ],
      myScore: { taps: 3, score: 3 },
    });
  });

  it('findTally: нет записи игрока — нули, нет очков — без победителя, нет раунда — null', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    expect(await scores.findTally(round.id, admin)).toEqual({
      total: 0,
      winner: null,
      standings: [],
      myScore: { taps: 0, score: 0 },
    });
    expect(await scores.findTally(randomUUID(), admin)).toBeNull();
  });

  it('standings: порядок score DESC, updated_at ASC, user_id ASC; нулевые очки включены', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const big = await insertUser('big', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const small = await insertUser('small', '00000000-0000-4000-8000-000000000001');
    const early = await insertUser('early');
    const top = await insertUser('top');
    const zero = await insertUser('zero');
    await ds.query(
      `INSERT INTO scores (round_id, user_id, taps, score, updated_at) VALUES
        ($1, $2, 5, 5, '2026-10-07T10:00:00Z'),
        ($1, $3, 5, 5, '2026-10-07T10:00:00Z'),
        ($1, $4, 5, 5, '2026-10-07T09:00:00Z'),
        ($1, $5, 9, 9, '2026-10-07T11:00:00Z'),
        ($1, $6, 0, 0, '2026-10-07T08:00:00Z')`,
      [round.id, big, small, early, top, zero],
    );
    const tally = await scores.findTally(round.id, admin);
    expect(tally?.standings.map((s) => [s.place, s.login, s.score])).toEqual([
      [1, 'top', 9],
      [2, 'early', 5],
      [3, 'small', 5],
      [4, 'big', 5],
      [5, 'zero', 0],
    ]);
  });

  it('standings: игрок без строки в scores не в списке; total равен сумме очков участников', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const [p1, p2] = await Promise.all(['p1', 'p2'].map((l) => insertUser(l)));
    await tap(round.id, p1, 12);
    await tap(round.id, p2, 25);
    const tally = await scores.findTally(round.id, admin);
    expect(tally?.standings.map((s) => s.userId)).toEqual([p2, p1]);
    expect(tally?.standings.reduce((sum, s) => sum + s.score, 0)).toBe(tally?.total);
  });

  it('registerParticipant: строка 0/0, повтор не дублирует и не меняет updated_at, total_score не меняется', async () => {
    const admin = await insertUser('a');
    const nik = await insertUser('nik');
    const round = await insertRound(-60, 3600, admin);
    await scores.registerParticipant(round.id, nik, GRACE);
    const first = await scores.findMine(round.id, nik);
    expect(first).toEqual(expect.objectContaining({ taps: 0, score: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    await scores.registerParticipant(round.id, nik, GRACE);
    const second = await scores.findMine(round.id, nik);
    expect(second?.updatedAt).toEqual(first?.updatedAt);
    const rows: { n: string }[] = await ds.query('SELECT count(*)::text AS n FROM scores WHERE round_id = $1', [
      round.id,
    ]);
    expect(rows[0].n).toBe('1');
    expect((await rounds.findById(round.id))?.totalScore).toBe(0);
  });

  it('registerParticipant: до старта и после grace строка не создаётся', async () => {
    const admin = await insertUser('a');
    const nik = await insertUser('nik');
    const future = await insertRound(60, 60, admin);
    const past = await insertRound(-120, 60, admin);
    await scores.registerParticipant(future.id, nik, GRACE);
    await scores.registerParticipant(past.id, nik, GRACE);
    await scores.registerParticipant(randomUUID(), nik, GRACE);
    const rows: { n: string }[] = await ds.query('SELECT count(*)::text AS n FROM scores');
    expect(rows[0].n).toBe('0');
  });

  it('standings: зарегистрированный участник с нулём стоит после игроков с очками, total без него', async () => {
    const admin = await insertUser('a');
    const nik = await insertUser('nik');
    const p1 = await insertUser('p1');
    const round = await insertRound(-60, 3600, admin);
    await scores.registerParticipant(round.id, nik, GRACE);
    await tap(round.id, p1, 4);
    const tally = await scores.findTally(round.id, admin);
    expect(tally?.standings.map((s) => [s.login, s.score])).toEqual([
      ['p1', 4],
      ['nik', 0],
    ]);
    expect(tally?.total).toBe(4);
    expect(tally?.winner?.userId).toBe(p1);
  });

  it('standings: топ-50 и строка запрашивающего ниже 50-го места последней, с реальным place', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const ids: string[] = [];
    for (let i = 0; i < STANDINGS_LIMIT + 5; i++) ids.push(await insertUser(`u${i}`));
    await ds.query(
      `INSERT INTO scores (round_id, user_id, taps, score)
       SELECT $1, x.id, 1, 1000 - x.n FROM unnest($2::uuid[]) WITH ORDINALITY AS x(id, n)`,
      [round.id, ids],
    );
    const without = await scores.findTally(round.id, admin);
    expect(without?.standings).toHaveLength(STANDINGS_LIMIT);
    expect(without?.standings[STANDINGS_LIMIT - 1].place).toBe(STANDINGS_LIMIT);

    const inTop = await scores.findTally(round.id, ids[3]);
    expect(inTop?.standings).toHaveLength(STANDINGS_LIMIT);

    const low = ids[STANDINGS_LIMIT + 2];
    const withLow = await scores.findTally(round.id, low);
    expect(withLow?.standings).toHaveLength(STANDINGS_LIMIT + 1);
    expect(withLow?.standings[STANDINGS_LIMIT]).toEqual({
      place: STANDINGS_LIMIT + 3,
      userId: low,
      login: `u${STANDINGS_LIMIT + 2}`,
      score: 1000 - (STANDINGS_LIMIT + 3),
    });
  });

  it('updated_at обновляется при каждом тапе', async () => {
    const u = await insertUser('p');
    const round = await insertRound(-60, 3600, u);
    const first = await tap(round.id, u, 1);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const second = await tap(round.id, u, 1);
    expect(second!.updatedAt.getTime()).toBeGreaterThan(first!.updatedAt.getTime());
  });

  it('ничья через applyTaps: побеждает набравший счёт раньше', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    const [p1, p2] = await Promise.all(['p1', 'p2'].map((l) => insertUser(l)));
    await tap(round.id, p1, 3);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await tap(round.id, p2, 3);
    expect((await winnerOf(round.id, admin))?.userId).toBe(p1);
  });

  it('победитель игнорирует нулевые очки', async () => {
    const admin = await insertUser('a');
    const round = await insertRound(-60, 3600, admin);
    await ds.query(`INSERT INTO scores (round_id, user_id, taps, score) VALUES ($1, $2, 0, 0)`, [round.id, admin]);
    expect(await winnerOf(round.id, admin)).toBeNull();
  });
});
