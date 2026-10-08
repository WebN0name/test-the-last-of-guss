import { User } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { formatRange } from '@/entities/round/format';
import { StatusBadge } from '@/entities/round/status-badge';
import type { RoundSummary } from '@/entities/round/types';
import { useRoundPhase } from '@/entities/round/use-round-phase';
import { useSession } from '@/entities/user/use-session';
import { SoundToggle } from '@/features/round/sound-toggle/sound-toggle';
import { preloadGooseSound } from '@/features/round/tap/goose-sound';
import { GooseButton } from '@/features/round/tap/goose-button';
import { ScorePops } from '@/features/round/tap/score-pops';
import { useSpaceTap } from '@/features/round/tap/use-space-tap';
import { useTapController } from '@/features/round/tap/use-tap-controller';
import { LAST_SECONDS_ALERT } from '@/shared/config/constants';
import { Button } from '@/shared/ui/button';
import { Countdown } from './countdown';
import { CountingPanel } from './counting-panel';
import { RoundResults } from './round-results';

const panel = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  transition: { duration: 0.25 },
};

export function RoundBoard({ summary }: { summary: RoundSummary }) {
  const { user } = useSession();
  const { round } = summary;
  const { phase, msToStart, msToEnd } = useRoundPhase(round);
  const controller = useTapController({
    roundId: round.id,
    startAt: round.startAt,
    endAt: round.endAt,
    initial: summary.myScore,
    isNikita: user?.role === 'nikita',
  });
  useSpaceTap(phase === 'active', controller.tap, controller.setPressed);
  const preloadable = phase === 'cooldown' || phase === 'active';
  useEffect(() => {
    if (preloadable) preloadGooseSound();
  }, [preloadable]);
  const bonusIn = 11 - (controller.taps % 11);
  const resultsReady = summary.total !== undefined;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3.5 px-4 pt-5 pb-8 sm:gap-4 sm:pt-8 sm:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <StatusBadge phase={phase} />
          <SoundToggle />
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="size-4" aria-hidden="true" />
          Создал <span className="font-bold text-foreground">{round.creator.login}</span>
        </span>
      </div>
      <section className="clay-card flex flex-col items-center gap-4 px-4 py-6 text-center sm:gap-5 sm:px-6 sm:py-8">
        <div className="relative flex justify-center">
          <ScorePops pops={controller.pops} onExpire={controller.expirePop} />
          <GooseButton
            phase={phase}
            pressed={controller.pressed}
            onPressChange={controller.setPressed}
            onTap={controller.tap}
          />
        </div>
        <AnimatePresence mode="wait">
          {phase === 'cooldown' ? (
            <m.div key="cooldown" {...panel} className="flex w-full flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <h2 className="text-[28px] sm:text-[32px]">Cooldown</h2>
                <Countdown ms={msToStart} label="До начала раунда" alert={false} />
              </div>
              <div className="h-0.5 w-full rounded bg-border" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Гусь проснётся сам, страницу обновлять не нужно. Разомни палец: 1 тап = 1 очко, каждый одиннадцатый —
                10.
              </p>
            </m.div>
          ) : null}
          {phase === 'active' ? (
            <m.div key="active" {...panel} className="flex w-full flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <h2 className="text-[28px] sm:text-[32px]">Раунд активен!</h2>
                <Countdown ms={msToEnd} label="До конца осталось" alert={msToEnd <= LAST_SECONDS_ALERT * 1000} />
              </div>
              <div className="h-0.5 w-full rounded bg-border" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-muted-foreground">Мои очки</span>
                <span className="num text-[30px] leading-none font-extrabold sm:text-[32px]" aria-live="polite">
                  {controller.score}
                </span>
                <span className="num text-[13px] text-muted-foreground">
                  Тапов: {controller.taps} · до бонуса ×10 ещё {bonusIn}
                </span>
              </div>
            </m.div>
          ) : null}
          {phase === 'counting' || (phase === 'finished' && !resultsReady) ? (
            <m.div key="counting" {...panel} className="w-full">
              <CountingPanel />
            </m.div>
          ) : null}
          {phase === 'finished' && resultsReady ? (
            <m.div key="finished" {...panel} className="flex w-full flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-1.5">
                <h2 className="text-[28px] sm:text-[32px]">Раунд завершён</h2>
                <p className="num text-sm text-muted-foreground">{formatRange(round.startAt, round.endAt)}</p>
              </div>
              <div className="h-0.5 w-full rounded bg-border" />
              <RoundResults
                total={summary.total ?? 0}
                winner={summary.winner ?? null}
                participants={summary.participants ?? []}
                myScore={summary.myScore}
              />
              <Button
                asChild
                className="clay-press mt-1 h-12 w-full rounded-full font-bold shadow-clay sm:w-auto sm:px-6"
              >
                <Link to="/rounds">К списку раундов</Link>
              </Button>
            </m.div>
          ) : null}
        </AnimatePresence>
      </section>
      {phase === 'active' ? (
        <p className="hidden text-center text-[13px] text-muted-foreground sm:block">
          Тапай мышью, пальцем или пробелом — считается всё.
        </p>
      ) : null}
    </main>
  );
}
