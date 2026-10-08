import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { decodeCursor, encodeCursor } from '../../src/domain/round/services/round-cursor.codec';
import { Round } from '../../src/domain/round/entities/round';
import { User } from '../../src/domain/user/entities/user';
import { TypeOrmRoundRepository } from '../../src/infrastructure/database/repositories/typeorm-round.repository';
import { TypeOrmUserRepository } from '../../src/infrastructure/database/repositories/typeorm-user.repository';
import { createTestDataSource, truncateAll } from './setup/test-db';

describe('TypeOrmRoundRepository', () => {
  let ds: DataSource;
  let rounds: TypeOrmRoundRepository;
  let users: TypeOrmUserRepository;
  const now = new Date('2026-10-07T12:00:00Z');
  const at = (sec: number): Date => new Date(now.getTime() + sec * 1000);
  let adminId: string;

  const makeRound = (startSec: number, durationSec: number): Round =>
    Round.restore({
      id: randomUUID(),
      creatorId: adminId,
      startAt: at(startSec),
      endAt: at(startSec + durationSec),
      totalScore: 0,
      createdAt: at(Math.min(startSec, 0) - 1),
    });

  beforeAll(async () => {
    ds = await createTestDataSource();
    rounds = new TypeOrmRoundRepository(ds);
    users = new TypeOrmUserRepository(ds);
  });

  beforeEach(async () => {
    await truncateAll(ds);
    adminId = randomUUID();
    await users.insert(User.create({ id: adminId, login: 'Admin', passwordHash: 'h', now }));
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('insert + findById + findViewById с логином создателя', async () => {
    const round = makeRound(30, 60);
    await rounds.insert(round);
    const found = await rounds.findById(round.id);
    expect(found?.startAt).toEqual(round.startAt);
    expect(found?.totalScore).toBe(0);
    const view = await rounds.findViewById(round.id);
    expect(view?.creatorLogin).toBe('Admin');
    expect(view?.round.id).toBe(round.id);
  });

  it('current: end_at > now, сортировка по start_at ASC', async () => {
    const past = makeRound(-200, 60);
    const active = makeRound(-10, 60);
    const future = makeRound(100, 60);
    for (const r of [future, past, active]) await rounds.insert(r);
    const page = await rounds.findPage({ scope: 'current', cursor: null, limit: 20, now });
    expect(page.items.map((v) => v.round.id)).toEqual([active.id, future.id]);
    expect(page.nextCursor).toBeNull();
  });

  it('finished: end_at <= now, сортировка по end_at DESC, курсор без дублей и пропусков', async () => {
    const all: Round[] = [];
    for (let i = 0; i < 5; i++) {
      const r = makeRound(-1000 + i * 100, 60);
      all.push(r);
      await rounds.insert(r);
    }
    const expectedOrder = [...all].sort((a, b) => b.endAt.getTime() - a.endAt.getTime()).map((r) => r.id);

    const page1 = await rounds.findPage({ scope: 'finished', cursor: null, limit: 2, now });
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();
    const cursor1 = decodeCursor(encodeCursor(page1.nextCursor!, 'finished'), 'finished');
    expect(cursor1.id).toBe(page1.items[1].round.id);
    expect(cursor1.sortValue).toEqual(page1.items[1].round.endAt);
    const page2 = await rounds.findPage({ scope: 'finished', cursor: page1.nextCursor, limit: 2, now });
    const page3 = await rounds.findPage({ scope: 'finished', cursor: page2.nextCursor, limit: 2, now });
    expect(page3.items).toHaveLength(1);
    expect(page3.nextCursor).toBeNull();

    const seen = [...page1.items, ...page2.items, ...page3.items].map((v) => v.round.id);
    expect(seen).toEqual(expectedOrder);
  });

  it('раунд, завершившийся между страницами, не ломает вторую страницу', async () => {
    const old1 = makeRound(-1000, 60);
    const old2 = makeRound(-900, 60);
    const old3 = makeRound(-800, 60);
    for (const r of [old1, old2, old3]) await rounds.insert(r);
    const page1 = await rounds.findPage({ scope: 'finished', cursor: null, limit: 2, now });
    const justEnded = makeRound(-70, 60);
    await rounds.insert(justEnded);
    const page2 = await rounds.findPage({ scope: 'finished', cursor: page1.nextCursor, limit: 2, now });
    expect(page2.items.map((v) => v.round.id)).toEqual([old1.id]);
  });

  it('одинаковый end_at: tie-break по id, без дублей', async () => {
    const a = makeRound(-500, 60);
    const b = Round.restore({ ...a, id: randomUUID(), creatorId: adminId });
    await rounds.insert(a);
    await rounds.insert(b);
    const page1 = await rounds.findPage({ scope: 'finished', cursor: null, limit: 1, now });
    const page2 = await rounds.findPage({ scope: 'finished', cursor: page1.nextCursor, limit: 1, now });
    expect([page1.items[0].round.id, page2.items[0].round.id]).toEqual([a.id, b.id].sort().reverse());
  });

  it('current с курсором: обход по start_at ASC, tie-break по id ASC', async () => {
    const first = makeRound(-30, 100);
    const tieA = makeRound(50, 60);
    const tieB = Round.restore({ ...tieA, id: randomUUID(), creatorId: adminId });
    const last = makeRound(200, 60);
    for (const r of [last, tieB, first, tieA]) await rounds.insert(r);
    const [t1, t2] = [tieA.id, tieB.id].sort();

    const seen: string[] = [];
    let cursor = null as Awaited<ReturnType<typeof rounds.findPage>>['nextCursor'];
    let pages = 0;
    do {
      const page = await rounds.findPage({ scope: 'current', cursor, limit: 2, now });
      seen.push(...page.items.map((v) => v.round.id));
      if (pages === 0) {
        expect(page.nextCursor?.id).toBe(page.items[1].round.id);
        expect(page.nextCursor?.sortValue).toEqual(page.items[1].round.startAt);
      }
      cursor = page.nextCursor;
      pages++;
    } while (cursor);
    expect(pages).toBe(2);
    expect(seen).toEqual([first.id, t1, t2, last.id]);
  });

  it('пустая таблица и курсор за последним элементом дают пустую страницу', async () => {
    for (const scope of ['current', 'finished'] as const) {
      const empty = await rounds.findPage({ scope, cursor: null, limit: 2, now });
      expect(empty).toEqual({ items: [], nextCursor: null });
    }
    const only = makeRound(-500, 60);
    await rounds.insert(only);
    const beyond = await rounds.findPage({
      scope: 'finished',
      cursor: { sortValue: new Date(only.endAt.getTime() - 1000), id: randomUUID() },
      limit: 2,
      now,
    });
    expect(beyond).toEqual({ items: [], nextCursor: null });
  });

  it('ровно полная последняя страница: nextCursor null', async () => {
    for (let i = 0; i < 4; i++) await rounds.insert(makeRound(-1000 + i * 100, 60));
    const page1 = await rounds.findPage({ scope: 'finished', cursor: null, limit: 2, now });
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await rounds.findPage({ scope: 'finished', cursor: page1.nextCursor, limit: 2, now });
    expect(page2.items).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();
  });
});
