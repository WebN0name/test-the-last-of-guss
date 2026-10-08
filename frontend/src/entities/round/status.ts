import type { Round, RoundPhase } from './types';

export function phaseAt(round: Pick<Round, 'startAt' | 'endAt'>, nowMs: number, countingDelayMs: number): RoundPhase {
  const start = new Date(round.startAt).getTime();
  const end = new Date(round.endAt).getTime();
  if (nowMs < start) return 'cooldown';
  if (nowMs < end) return 'active';
  if (nowMs < end + countingDelayMs) return 'counting';
  return 'finished';
}

const LABELS: Record<RoundPhase, string> = {
  cooldown: 'Cooldown',
  active: 'Активен',
  counting: 'Завершён',
  finished: 'Завершён',
};

export function phaseLabel(phase: RoundPhase): string {
  return LABELS[phase];
}
