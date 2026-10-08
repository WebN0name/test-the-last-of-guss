import { m, useReducedMotion } from 'motion/react';
import { memo } from 'react';
import type { RoundPhase } from '@/entities/round/types';
import gooseReady from '@/shared/assets/guss_ready.png';
import gooseStop from '@/shared/assets/guss_stop.png';
import gooseTapped from '@/shared/assets/guss_tapped.png';
import { cn } from '@/shared/lib/cn';

type GooseFrame = 'stop' | 'ready' | 'tapped';

const FRAMES: ReadonlyArray<{ frame: GooseFrame; src: string }> = [
  { frame: 'stop', src: gooseStop },
  { frame: 'ready', src: gooseReady },
  { frame: 'tapped', src: gooseTapped },
];

interface Props {
  phase: RoundPhase;
  pressed: boolean;
  onPressChange: (pressed: boolean) => void;
  onTap: () => void;
}

const LABEL: Record<RoundPhase, string> = {
  cooldown: 'Гусь ещё спит, раунд не начался',
  active: 'Тапнуть гуся',
  counting: 'Раунд завершён, идёт подсчёт',
  finished: 'Раунд завершён, гусь отдыхает',
};

export const GooseButton = memo(function GooseButton({ phase, pressed, onPressChange, onTap }: Props) {
  const active = phase === 'active';
  const reduceMotion = useReducedMotion();
  const visible: GooseFrame = !active ? 'stop' : pressed ? 'tapped' : 'ready';
  return (
    <m.button
      type="button"
      aria-label={LABEL[phase]}
      disabled={!active}
      onClick={onTap}
      onTapStart={() => onPressChange(true)}
      onTap={() => onPressChange(false)}
      onTapCancel={() => onPressChange(false)}
      whileTap={active && !reduceMotion ? { scale: 0.92, rotate: -2 } : undefined}
      transition={{ type: 'spring', visualDuration: 0.15, bounce: 0.35 }}
      className="relative cursor-pointer rounded-full select-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
      style={{ willChange: 'transform', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="pointer-events-none relative block size-50 sm:size-64">
        {FRAMES.map(({ frame, src }) => (
          <img
            key={frame}
            src={src}
            alt=""
            width={256}
            height={256}
            draggable={false}
            data-frame={frame}
            data-visible={frame === visible}
            className={cn(
              'absolute inset-0 block size-full',
              frame === 'stop' && 'rounded-3xl',
              frame === visible ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
      </span>
    </m.button>
  );
});
