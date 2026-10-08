import { AnimatePresence, m } from 'motion/react';
import { memo } from 'react';
import type { Pop } from './tap-reducer';

interface Props {
  pops: Pop[];
  onExpire: (id: number) => void;
}

export const ScorePops = memo(function ScorePops({ pops, onExpire }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center" aria-hidden="true">
      <AnimatePresence>
        {pops.map((pop) => (
          <m.span
            key={pop.id}
            initial={{ opacity: 0, y: 0, x: pop.dx, scale: pop.gain === 10 ? 0.6 : 0.9 }}
            animate={{ opacity: [0, 1, 1, 0], y: -56, scale: pop.gain === 10 ? 1.3 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: pop.gain === 10 ? 0.8 : 0.5, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
            onAnimationComplete={() => onExpire(pop.id)}
            className={`num absolute rounded-full px-3.5 py-1 font-heading font-bold ${pop.gain === 10 ? 'bg-accent text-[28px] text-accent-foreground' : 'text-xl text-muted-foreground'}`}
          >
            {pop.gain === 10 ? '+10' : '+1'}
          </m.span>
        ))}
      </AnimatePresence>
    </div>
  );
});
