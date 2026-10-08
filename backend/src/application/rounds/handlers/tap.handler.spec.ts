import { Round } from '../../../domain/round/entities/round';
import { RoundNotActiveError, RoundNotFoundError } from '../../../domain/round/errors/round.errors';
import { UserRole } from '../../../domain/user/value-objects/user-role';
import { FakeGameConfig } from '../../../test-support/fakes/fake-game-config';
import { FakeRoundRepository } from '../../../test-support/fakes/fake-round.repository';
import { FakeScoreRepository } from '../../../test-support/fakes/fake-score.repository';
import { FixedClock } from '../../../test-support/fakes/fixed-clock';
import { TapCommand } from '../commands/tap.command';
import { TapHandler } from './tap.handler';

describe('TapHandler', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  let rounds: FakeRoundRepository;
  let scores: FakeScoreRepository;
  let clock: FixedClock;
  let handler: TapHandler;
  let active: Round;

  beforeEach(async () => {
    rounds = new FakeRoundRepository();
    scores = new FakeScoreRepository();
    clock = new FixedClock(now);
    handler = new TapHandler(rounds, scores, clock, new FakeGameConfig());
    active = Round.create({
      id: 'r1',
      creatorId: 'a',
      now: new Date(now.getTime() - 60_000),
      cooldownSec: 0,
      durationSec: 120,
    });
    await rounds.insert(active);
  });

  it('активный раунд → applyTaps с параметрами из конфига, результат наружу', async () => {
    scores.applyTapsResult = { roundId: 'r1', userId: 'u', taps: 3, score: 3, updatedAt: now };
    const result = await handler.execute(new TapCommand('u', UserRole.Survivor, 'r1', 3));
    expect(result).toEqual({ taps: 3, score: 3 });
    expect(scores.calls[0]).toEqual({ roundId: 'r1', userId: 'u', count: 3, graceSec: 2, maxTps: 20 });
  });

  it('неизвестный раунд → RoundNotFoundError', async () => {
    await expect(handler.execute(new TapCommand('u', UserRole.Survivor, 'nope', 1))).rejects.toBeInstanceOf(
      RoundNotFoundError,
    );
  });

  it('cooldown → RoundNotActiveError без вызова applyTaps', async () => {
    clock.set(new Date(now.getTime() - 90_000));
    await expect(handler.execute(new TapCommand('u', UserRole.Survivor, 'r1', 1))).rejects.toBeInstanceOf(
      RoundNotActiveError,
    );
    expect(scores.calls).toHaveLength(0);
  });

  it('после end_at + grace → RoundNotActiveError', async () => {
    clock.set(new Date(active.endAt.getTime() + 2_001));
    await expect(handler.execute(new TapCommand('u', UserRole.Survivor, 'r1', 1))).rejects.toBeInstanceOf(
      RoundNotActiveError,
    );
  });

  it('внутри grace → applyTaps вызывается', async () => {
    clock.set(new Date(active.endAt.getTime() + 1_000));
    scores.applyTapsResult = { roundId: 'r1', userId: 'u', taps: 1, score: 1, updatedAt: now };
    await handler.execute(new TapCommand('u', UserRole.Survivor, 'r1', 1));
    expect(scores.calls).toHaveLength(1);
  });

  it('nikita → нули, registerParticipant вместо applyTaps, раунд проверяется', async () => {
    const result = await handler.execute(new TapCommand('n', UserRole.Nikita, 'r1', 5));
    expect(result).toEqual({ taps: 0, score: 0 });
    expect(scores.calls).toHaveLength(0);
    expect(scores.registered).toEqual([{ roundId: 'r1', userId: 'n', graceSec: new FakeGameConfig().tapGraceSec }]);
    await expect(handler.execute(new TapCommand('n', UserRole.Nikita, 'nope', 1))).rejects.toBeInstanceOf(
      RoundNotFoundError,
    );
    expect(scores.registered).toHaveLength(1);
  });

  it('applyTaps вернул null (гонка на границе или потолок) → RoundNotActiveError', async () => {
    scores.applyTapsResult = null;
    await expect(handler.execute(new TapCommand('u', UserRole.Survivor, 'r1', 1))).rejects.toBeInstanceOf(
      RoundNotActiveError,
    );
  });

  it('admin тапает как survivor', async () => {
    scores.applyTapsResult = { roundId: 'r1', userId: 'a', taps: 1, score: 1, updatedAt: now };
    expect(await handler.execute(new TapCommand('a', UserRole.Admin, 'r1', 1))).toEqual({ taps: 1, score: 1 });
  });
});
