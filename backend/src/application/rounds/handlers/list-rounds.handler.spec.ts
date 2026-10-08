import { Round } from '../../../domain/round/entities/round';
import { encodeCursor } from '../../../domain/round/services/round-cursor.codec';
import { InvalidCursorError } from '../../../domain/round/errors/round.errors';
import { FakeRoundRepository } from '../../../test-support/fakes/fake-round.repository';
import { FixedClock } from '../../../test-support/fakes/fixed-clock';
import { ListRoundsQuery } from '../queries/list-rounds.query';
import { ListRoundsHandler } from './list-rounds.handler';

describe('ListRoundsHandler', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  const at = (sec: number): Date => new Date(now.getTime() + sec * 1000);
  const uuid = (suffix: string): string => `00000000-0000-4000-8000-0000000000${suffix}`;
  const ids = { f1: uuid('f1'), f2: uuid('f2'), f3: uuid('f3'), c1: uuid('c1'), c2: uuid('c2') };
  const creatorId = '00000000-0000-4000-8000-0000000000a1';
  let rounds: FakeRoundRepository;
  let handler: ListRoundsHandler;

  const make = (id: string, startSec: number): Round =>
    Round.restore({
      id,
      creatorId,
      startAt: at(startSec),
      endAt: at(startSec + 60),
      totalScore: 0,
      createdAt: at(startSec - 1),
    });

  beforeEach(async () => {
    rounds = new FakeRoundRepository();
    rounds.creatorLogins.set(creatorId, 'Boss');
    handler = new ListRoundsHandler(rounds, new FixedClock(now));
    for (const [id, s] of [
      [ids.f1, -500],
      [ids.f2, -400],
      [ids.f3, -300],
      [ids.c1, -10],
      [ids.c2, 100],
    ] as const) {
      await rounds.insert(make(id, s));
    }
  });

  it('current возвращает незавершённые по start_at', async () => {
    const result = await handler.execute(new ListRoundsQuery('current', null, 20));
    expect(result.items.map((v) => v.round.id)).toEqual([ids.c1, ids.c2]);
    expect(result.items.every((v) => v.creatorLogin === 'Boss')).toBe(true);
    expect(result.nextCursor).toBeNull();
  });

  it('возвращает now, по которому отфильтрован список', async () => {
    const result = await handler.execute(new ListRoundsQuery('current', null, 20));
    expect(result.now).toEqual(now);
  });

  it('finished пагинируется строковым курсором', async () => {
    const p1 = await handler.execute(new ListRoundsQuery('finished', null, 2));
    expect(p1.items.map((v) => v.round.id)).toEqual([ids.f3, ids.f2]);
    expect(typeof p1.nextCursor).toBe('string');
    const p2 = await handler.execute(new ListRoundsQuery('finished', p1.nextCursor, 2));
    expect(p2.items.map((v) => v.round.id)).toEqual([ids.f1]);
    expect(p2.nextCursor).toBeNull();
  });

  it('мусорный курсор → InvalidCursorError', async () => {
    await expect(handler.execute(new ListRoundsQuery('finished', 'garbage', 2))).rejects.toBeInstanceOf(
      InvalidCursorError,
    );
  });

  it('чужой курсор (другая вкладка) → InvalidCursorError', async () => {
    const cursor = encodeCursor({ sortValue: at(-10_000), id: '00000000-0000-0000-0000-000000000000' }, 'current');
    await expect(handler.execute(new ListRoundsQuery('finished', cursor, 2))).rejects.toBeInstanceOf(
      InvalidCursorError,
    );
  });
});
