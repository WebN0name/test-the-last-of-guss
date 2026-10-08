import { deltaFor, pointsForTap, scoreFor } from './scoring-rule';

describe('ScoringRule', () => {
  it.each([
    [1, 1],
    [10, 1],
    [11, 10],
    [12, 1],
    [22, 10],
    [33, 10],
  ])('pointsForTap(%i) = %i', (n, expected) => {
    expect(pointsForTap(n)).toBe(expected);
  });

  it.each([
    [0, 0],
    [1, 1],
    [10, 10],
    [11, 20],
    [21, 30],
    [22, 40],
    [50, 86],
  ])('scoreFor(%i) = %i', (taps, expected) => {
    expect(scoreFor(taps)).toBe(expected);
  });

  it('deltaFor равен разности scoreFor для любого батча', () => {
    for (let before = 0; before < 60; before++) {
      for (let count = 1; count <= 20; count++) {
        expect(deltaFor(before, count)).toBe(scoreFor(before + count) - scoreFor(before));
      }
    }
  });

  it('батч, пересекающий границу 11, даёт бонус ровно один раз', () => {
    expect(deltaFor(9, 5)).toBe(14);
  });

  it('батч, пересекающий две границы, даёт два бонуса', () => {
    expect(deltaFor(10, 12)).toBe(30);
  });
});
