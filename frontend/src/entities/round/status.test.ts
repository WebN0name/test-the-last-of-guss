import { describe, expect, it } from 'vitest';
import { phaseAt } from './status';
import type { Round } from './types';

const round: Round = {
  id: 'r',
  creator: { id: 'a', login: 'admin' },
  startAt: '2026-10-07T10:00:30.000Z',
  endAt: '2026-10-07T10:01:30.000Z',
  status: 'cooldown',
  createdAt: '2026-10-07T10:00:00.000Z',
};
const t = (iso: string): number => new Date(iso).getTime();

describe('phaseAt', () => {
  it.each([
    ['2026-10-07T10:00:29.999Z', 'cooldown'],
    ['2026-10-07T10:00:30.000Z', 'active'],
    ['2026-10-07T10:01:29.999Z', 'active'],
    ['2026-10-07T10:01:30.000Z', 'counting'],
    ['2026-10-07T10:01:32.499Z', 'counting'],
    ['2026-10-07T10:01:32.500Z', 'finished'],
  ])('%s → %s', (iso, phase) => {
    expect(phaseAt(round, t(iso), 2500)).toBe(phase);
  });
});
