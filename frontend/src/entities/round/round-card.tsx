import { User } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { formatCountdown } from '@/shared/lib/format-duration';
import { formatDateTime } from './format';
import { phaseLabel } from './status';
import { StatusBadge } from './status-badge';
import type { Round } from './types';
import { useRoundPhase } from './use-round-phase';

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-2 sm:flex-col sm:justify-start sm:gap-0">
      <span className="text-sm font-semibold text-muted-foreground sm:text-[13px]">{label}</span>
      <span className="num text-sm font-semibold sm:text-base">{value}</span>
    </div>
  );
}

export function RoundCard({ round }: { round: Round }) {
  const { phase, msToStart, msToEnd } = useRoundPhase(round);
  const over = phase === 'finished' || phase === 'counting';
  const headline =
    phase === 'cooldown'
      ? `До старта ${formatCountdown(msToStart)}`
      : phase === 'active'
        ? `До конца ${formatCountdown(msToEnd)}`
        : 'Итоги — на странице раунда';

  return (
    <Link
      to={`/rounds/${round.id}`}
      aria-label={`Раунд, создал ${round.creator.login}, ${phaseLabel(phase)}`}
      className="clay-card flex flex-col gap-3 p-4 text-inherit no-underline transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring motion-reduce:transition-none sm:gap-3.5 sm:px-6 sm:py-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        <StatusBadge phase={phase} />
        <span
          aria-hidden="true"
          className={cn(
            'num text-[17px] font-extrabold sm:text-lg',
            over && 'text-sm font-semibold text-muted-foreground sm:text-sm',
          )}
        >
          {headline}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="size-4" aria-hidden="true" />
        <span>Создал</span>
        <span className="font-bold text-foreground">{round.creator.login}</span>
      </div>
      <div className="h-0.5 rounded bg-border" />
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3">
        <DateRow label="Старт" value={formatDateTime(round.startAt)} />
        <DateRow label="Конец" value={formatDateTime(round.endAt)} />
      </div>
    </Link>
  );
}
