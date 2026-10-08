import { describe, expect, it } from 'vitest';
import { formatCountdown } from './format-duration';

describe('formatCountdown', () => {
  it.each([
    [0, '00:00'],
    [-500, '00:00'],
    [999, '00:01'],
    [15_000, '00:15'],
    [83_000, '01:23'],
    [3_600_000, '1:00:00'],
    [3_661_000, '1:01:01'],
  ])('%i мс → %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
