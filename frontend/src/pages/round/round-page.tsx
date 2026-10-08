import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { roundsApi } from '@/entities/round/api';
import { phaseAt } from '@/entities/round/status';
import { isApiError } from '@/shared/api/errors';
import { COUNTING_DELAY_MS } from '@/shared/config/constants';
import { serverNow } from '@/shared/server-clock/server-clock';
import { useServerNow } from '@/shared/server-clock/use-server-now';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Header } from '@/widgets/header/header';
import { RoundBoard } from '@/widgets/round-board/round-board';

const TITLE = {
  cooldown: 'Cooldown',
  active: 'Раунд активен',
  counting: 'Раунд завершён',
  finished: 'Раунд завершён',
} as const;
const RESULTS_RETRY_MS = 2000;

function isNotFound(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return error.code === 'ROUND_NOT_FOUND' || error.code === 'VALIDATION_ERROR' || error.status === 404;
}

function isClientError(error: unknown): boolean {
  return isApiError(error) && error.status >= 400 && error.status < 500;
}

function RoundSkeleton() {
  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3.5 px-4 pt-5 pb-8 sm:gap-4 sm:pt-8 sm:pb-12"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-5 w-36" />
      </div>
      <section className="clay-card flex flex-col items-center gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8">
        <Skeleton className="size-50 rounded-full sm:size-64" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-11 w-32" />
        </div>
        <div className="h-0.5 w-full rounded bg-border" />
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-52" />
        </div>
      </section>
    </main>
  );
}

export function RoundPage() {
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['round', id],
    queryFn: () => roundsApi.get(id),
    enabled: id.length > 0,
    retry: (count, error) => !isClientError(error) && count < 1,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data || data.total !== undefined) return false;
      return phaseAt(data.round, serverNow(), COUNTING_DELAY_MS) === 'finished' ? RESULTS_RETRY_MS : false;
    },
  });
  const now = useServerNow();
  const data = query.data;
  const phase = data ? phaseAt(data.round, now, COUNTING_DELAY_MS) : null;
  const awaitingResults = phase === 'finished' && data !== undefined && data.total === undefined;
  const { refetch } = query;

  useEffect(() => {
    if (awaitingResults) void refetch();
  }, [awaitingResults, refetch]);

  const title = phase ? TITLE[phase] : 'Раунд';
  const notFound = isNotFound(query.error);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title={title} backTo="/rounds" />
      {data ? (
        <RoundBoard key={data.round.id} summary={data} />
      ) : query.isError ? (
        <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 pt-12 text-center" role="alert">
          <h2 className="text-2xl">{notFound ? 'Такого раунда нет' : 'Не удалось загрузить раунд'}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {notFound ? null : (
              <Button className="h-11 rounded-full font-bold" onClick={() => void refetch()}>
                Повторить
              </Button>
            )}
            <Button asChild variant="secondary" className="h-11 rounded-full font-bold">
              <Link to="/rounds">К списку раундов</Link>
            </Button>
          </div>
        </main>
      ) : (
        <RoundSkeleton />
      )}
    </div>
  );
}
