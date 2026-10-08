import { useEffect, useState } from 'react';
import { COUNTING_DELAY_MS } from '@/shared/config/constants';
import { serverNow } from '@/shared/server-clock/server-clock';
import { phaseAt } from './status';
import type { Round, RoundPhase } from './types';

const TICK_MS = 1000;

export interface RoundPhaseState {
  phase: RoundPhase;
  msToStart: number;
  msToEnd: number;
  now: number;
}

function nextBoundary(startMs: number, endMs: number, now: number): number | null {
  return [startMs, endMs, endMs + COUNTING_DELAY_MS].find((at) => at > now) ?? null;
}

export function useRoundPhase(round: Pick<Round, 'startAt' | 'endAt'>): RoundPhaseState {
  const [now, setNow] = useState(() => serverNow());
  const startMs = new Date(round.startAt).getTime();
  const endMs = new Date(round.endAt).getTime();
  const phase = phaseAt(round, now, COUNTING_DELAY_MS);
  const ticking = phase === 'cooldown' || phase === 'active';
  const boundary = nextBoundary(startMs, endMs, now);

  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(serverNow()), TICK_MS);
    return () => window.clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    if (boundary === null) return;
    const id = window.setTimeout(() => setNow(serverNow()), Math.max(0, boundary - serverNow()));
    return () => window.clearTimeout(id);
  }, [boundary, now]);

  return { phase, msToStart: startMs - now, msToEnd: endMs - now, now };
}
