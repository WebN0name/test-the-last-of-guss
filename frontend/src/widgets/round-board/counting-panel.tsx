import { Skeleton } from '@/shared/ui/skeleton';

export function CountingPanel() {
  return (
    <div className="flex w-full flex-col items-center gap-5" aria-busy="true">
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-[28px] sm:text-[32px]">Раунд завершён</h2>
        <p className="font-semibold text-muted-foreground">
          Идёт подсчёт
          <span className="animate-pulse motion-reduce:animate-none">…</span>
        </p>
        <p className="text-[13px] text-muted-foreground">Собираем последние тапы, пара секунд</p>
      </div>
      <div className="h-0.5 w-full rounded bg-border" />
      <div className="flex w-full flex-col gap-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
