import { Round } from './round';

describe('Round', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  const at = (sec: number): Date => new Date(now.getTime() + sec * 1000);

  const round = Round.create({ id: 'r1', creatorId: 'u1', now, cooldownSec: 30, durationSec: 60 });

  it('create считает даты от now', () => {
    expect(round.createdAt).toEqual(now);
    expect(round.startAt).toEqual(at(30));
    expect(round.endAt).toEqual(at(90));
    expect(round.totalScore).toBe(0);
  });

  it.each([
    [0, 'cooldown'],
    [29, 'cooldown'],
    [30, 'active'],
    [89, 'active'],
    [90, 'finished'],
    [1000, 'finished'],
  ])('statusAt(+%is) = %s', (sec, status) => {
    expect(round.statusAt(at(sec))).toBe(status);
  });

  it.each([
    [29, false],
    [30, true],
    [89, true],
    [90, true],
    [91.9, true],
    [92, false],
  ])('isTappableAt(+%ss, grace 2) = %s', (sec, expected) => {
    expect(round.isTappableAt(at(sec), 2)).toBe(expected);
  });

  it('isTappableAt без grace отклоняет ровно в endAt', () => {
    expect(round.isTappableAt(at(90), 0)).toBe(false);
  });
});
