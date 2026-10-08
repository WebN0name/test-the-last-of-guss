export const BONUS_EVERY = 11;
export const BONUS_POINTS = 10;

export function pointsForTap(n: number): number {
  return n % BONUS_EVERY === 0 ? BONUS_POINTS : 1;
}

export function scoreFor(taps: number): number {
  return taps + (BONUS_POINTS - 1) * Math.floor(taps / BONUS_EVERY);
}

export function deltaFor(tapsBefore: number, count: number): number {
  return scoreFor(tapsBefore + count) - scoreFor(tapsBefore);
}
