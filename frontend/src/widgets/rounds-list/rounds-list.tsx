import { AnimatePresence, m, stagger } from 'motion/react';
import type { Variants } from 'motion/react';
import { useEffect, useRef } from 'react';
import { RoundCard } from '@/entities/round/round-card';
import type { RoundScope } from '@/entities/round/types';
import { useInfiniteRounds } from '@/features/rounds/paginate/use-infinite-rounds';
import { useServerNow } from '@/shared/server-clock/use-server-now';
import { NextPageError, RoundsEmpty, RoundsError, RoundsLoading, RoundsSkeleton } from './list-states';

const list: Variants = { show: { transition: { delayChildren: stagger(0.04) } } };
const card: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', visualDuration: 0.3, bounce: 0.2 } },
};

export function RoundsList({ scope }: { scope: RoundScope }) {
  const query = useInfiniteRounds(scope);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;
  const now = useServerNow();
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage || isFetchNextPageError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (query.isPending) return <RoundsLoading />;
  if (query.isError && !query.data) return <RoundsError onRetry={() => void query.refetch()} />;

  const groups = (query.data ?? [])
    .map((page) => (scope === 'current' ? page.filter((r) => new Date(r.endAt).getTime() > now) : page))
    .filter((page) => page.length > 0);
  if (groups.length === 0 && !hasNextPage) return <RoundsEmpty scope={scope} />;

  return (
    <>
      <div className="flex flex-col gap-4">
        {groups.map((page, index) => (
          <m.ul key={index} variants={list} initial="hidden" animate="show" className="flex flex-col gap-4">
            <AnimatePresence>
              {page.map((round) => (
                <m.li key={round.id} layout variants={card} exit={{ opacity: 0, scale: 0.98 }}>
                  <RoundCard round={round} />
                </m.li>
              ))}
            </AnimatePresence>
          </m.ul>
        ))}
      </div>
      <div ref={sentinel} className="h-px" />
      {isFetchNextPageError ? <NextPageError onRetry={() => void fetchNextPage()} /> : null}
      {isFetchingNextPage || (groups.length === 0 && hasNextPage && !isFetchNextPageError) ? (
        <RoundsSkeleton count={1} />
      ) : null}
      {isFetchNextPageError ? null : (
        <p className="text-center text-[13px] text-muted-foreground">
          {scope === 'current'
            ? 'Список обновляется каждые 5 секунд'
            : hasNextPage
              ? 'Загружаем ещё…'
              : 'Это все раунды'}
        </p>
      )}
    </>
  );
}
