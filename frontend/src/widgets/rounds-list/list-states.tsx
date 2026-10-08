import { CircleAlert, Egg, RefreshCw } from 'lucide-react';
import type { RoundScope } from '@/entities/round/types';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

export function RoundsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="clay-card flex flex-col gap-3 p-4 sm:gap-3.5 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-2.5">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <div className="h-0.5 rounded bg-border" />
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3">
            <Skeleton className="h-5 sm:h-[42px]" />
            <Skeleton className="h-5 sm:h-[42px]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RoundsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <p className="text-sm text-muted-foreground">Загружаем раунды…</p>
      <RoundsSkeleton />
    </div>
  );
}

export function RoundsEmpty({ scope }: { scope: RoundScope }) {
  const current = scope === 'current';
  return (
    <div className="clay-card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="flex size-18 items-center justify-center rounded-full bg-muted text-primary">
        <Egg className="size-9" />
      </div>
      <h2 className="text-2xl">{current ? 'Раундов пока нет' : 'Завершённых раундов пока нет'}</h2>
      <p className="max-w-sm text-muted-foreground">
        {current
          ? 'Гусь отдыхает. Новый раунд появится здесь сразу после создания.'
          : 'Когда раунды закончатся, они появятся здесь.'}
      </p>
    </div>
  );
}

export function NextPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm font-semibold text-destructive">Не удалось загрузить следующие раунды</p>
      <Button variant="secondary" onClick={onRetry} className="clay-press h-11 rounded-full font-bold">
        <RefreshCw className="size-5" />
        Повторить
      </Button>
    </div>
  );
}

export function RoundsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="clay-card flex flex-col items-center gap-4 border-destructive px-6 py-10 text-center">
      <div className="flex size-18 items-center justify-center rounded-full bg-destructive-soft text-destructive">
        <CircleAlert className="size-9" />
      </div>
      <h2 className="text-2xl">Не удалось загрузить раунды</h2>
      <p className="max-w-md text-muted-foreground">
        Сервер не ответил. Проверь соединение и попробуй ещё раз — список подтянется автоматически, когда связь
        вернётся.
      </p>
      <Button variant="secondary" onClick={onRetry} className="clay-press mt-2 h-11 rounded-full font-bold">
        <RefreshCw className="size-5" />
        Повторить
      </Button>
    </div>
  );
}
