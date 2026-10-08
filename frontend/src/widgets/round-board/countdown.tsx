import { m } from 'motion/react';
import { formatCountdown } from '@/shared/lib/format-duration';

interface Props {
  ms: number;
  label: string;
  alert: boolean;
}

export function Countdown({ ms, label, alert }: Props) {
  const text = formatCountdown(ms);
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <p className="text-muted-foreground">{label}</p>
      <m.div
        key={alert ? text : 'steady'}
        animate={alert ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`num text-[44px] leading-none font-extrabold sm:text-5xl ${alert ? 'text-destructive' : ''}`}
      >
        {text}
      </m.div>
    </div>
  );
}
