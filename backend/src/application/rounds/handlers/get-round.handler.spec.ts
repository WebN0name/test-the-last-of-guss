import { Round } from '../../../domain/round/entities/round';
import { RoundNotFoundError } from '../../../domain/round/errors/round.errors';
import { FakeRoundRepository } from '../../../test-support/fakes/fake-round.repository';
import { FakeScoreRepository } from '../../../test-support/fakes/fake-score.repository';
import { FakeGameConfig } from '../../../test-support/fakes/fake-game-config';
import { FixedClock } from '../../../test-support/fakes/fixed-clock';
import { GetRoundQuery } from '../queries/get-round.query';
import { GetRoundHandler } from './get-round.handler';

describe('GetRoundHandler', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  let rounds: FakeRoundRepository;
  let scores: FakeScoreRepository;
  let clock: FixedClock;
  let config: FakeGameConfig;
  let handler: GetRoundHandler;

  beforeEach(async () => {
    rounds = new FakeRoundRepository();
    scores = new FakeScoreRepository();
    clock = new FixedClock(now);
    config = new FakeGameConfig();
    handler = new GetRoundHandler(rounds, scores, clock, config);
    rounds.creatorLogins.set('a', 'Boss');
    await rounds.insert(
      Round.restore({
        id: 'r1',
        creatorId: 'a',
        startAt: now,
        endAt: new Date(now.getTime() + 60_000),
        totalScore: 42,
        createdAt: now,
      }),
    );
  });

  it('активный раунд: мои очки, без total и winner', async () => {
    scores.mine = { roundId: 'r1', userId: 'u', taps: 5, score: 5, updatedAt: now };
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.view.creatorLogin).toBe('Boss');
    expect(s.myScore).toEqual({ taps: 5, score: 5 });
    expect(s.total).toBeNull();
    expect(s.winner).toBeNull();
    expect(s.standings).toBeNull();
    expect(s.now).toEqual(now);
  });

  it('нет записи очков → нули', async () => {
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.myScore).toEqual({ taps: 0, score: 0 });
  });

  it('завершённый раунд: total, winner и мои очки из одного снимка итогов', async () => {
    clock.advance(60 + config.tapGraceSec);
    scores.total = 50;
    scores.winner = { userId: 'w', login: 'Иван', score: 100 };
    scores.mine = { roundId: 'r1', userId: 'u', taps: 7, score: 7, updatedAt: now };
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.total).toBe(50);
    expect(s.winner).toEqual({ userId: 'w', login: 'Иван', score: 100 });
    expect(s.myScore).toEqual({ taps: 7, score: 7 });
  });

  it('завершённый раунд: участники из того же снимка итогов', async () => {
    clock.advance(60 + config.tapGraceSec);
    scores.standings = [
      { place: 1, userId: 'w', login: 'Иван', score: 100 },
      { place: 2, userId: 'u', login: 'Пётр', score: 7 },
    ];
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.standings).toEqual(scores.standings);
  });

  it('окно приёма тапов: участников нет', async () => {
    clock.set(new Date(now.getTime() + 60_000 + config.tapGraceSec * 1000 - 1));
    scores.standings = [{ place: 1, userId: 'w', login: 'Иван', score: 100 }];
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.standings).toBeNull();
  });

  it('завершённый раунд без победителя: winner null', async () => {
    clock.advance(60 + config.tapGraceSec);
    scores.total = 0;
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.total).toBe(0);
    expect(s.winner).toBeNull();
    expect(s.myScore).toEqual({ taps: 0, score: 0 });
  });

  it('итоги не найдены → RoundNotFoundError', async () => {
    clock.advance(60 + config.tapGraceSec);
    scores.total = null;
    await expect(handler.execute(new GetRoundQuery('r1', 'u'))).rejects.toBeInstanceOf(RoundNotFoundError);
  });

  it('окно приёма тапов: endAt + grace - 1 мс → finished без итогов', async () => {
    clock.set(new Date(now.getTime() + 60_000 + config.tapGraceSec * 1000 - 1));
    scores.winner = { userId: 'w', login: 'Иван', score: 100 };
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.view.round.statusAt(s.now)).toBe('finished');
    expect(s.total).toBeNull();
    expect(s.winner).toBeNull();
  });

  it('ровно endAt + grace → итоги есть', async () => {
    clock.set(new Date(now.getTime() + 60_000 + config.tapGraceSec * 1000));
    scores.total = 42;
    scores.winner = { userId: 'w', login: 'Иван', score: 100 };
    const s = await handler.execute(new GetRoundQuery('r1', 'u'));
    expect(s.total).toBe(42);
    expect(s.winner).toEqual({ userId: 'w', login: 'Иван', score: 100 });
  });

  it('неизвестный → RoundNotFoundError', async () => {
    await expect(handler.execute(new GetRoundQuery('x', 'u'))).rejects.toBeInstanceOf(RoundNotFoundError);
  });
});
