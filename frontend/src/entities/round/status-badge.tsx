import { Flag, Hourglass, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { phaseLabel } from './status';
import type { RoundPhase } from './types';

const CONFIG = {
  cooldown: {
    Icon: Hourglass,
    className: 'bg-status-cooldown-bg text-status-cooldown-fg',
  },
  active: { Icon: Zap, className: 'bg-status-active-bg text-status-active-fg' },
  counting: {
    Icon: Flag,
    className: 'bg-status-finished-bg text-status-finished-fg',
  },
  finished: {
    Icon: Flag,
    className: 'bg-status-finished-bg text-status-finished-fg',
  },
} as const;

export function StatusBadge({ phase }: { phase: RoundPhase }) {
  const { Icon, className } = CONFIG[phase];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold', className)}>
      <Icon className="size-4" aria-hidden="true" />
      {phaseLabel(phase)}
    </span>
  );
}
