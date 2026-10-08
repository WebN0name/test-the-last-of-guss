import { m } from 'motion/react';
import type { RoundScope } from '@/entities/round/types';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';

const TABS: { value: RoundScope; label: string }[] = [
  { value: 'current', label: 'Текущие' },
  { value: 'finished', label: 'Завершённые' },
];

export function RoundsTabs({ scope, onChange }: { scope: RoundScope; onChange: (scope: RoundScope) => void }) {
  return (
    <Tabs className="w-full sm:w-auto" value={scope} onValueChange={(v) => onChange(v as RoundScope)}>
      <TabsList className="h-12 w-full rounded-full sm:w-fit bg-muted p-1" aria-label="Фильтр раундов">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="relative h-10 rounded-full px-5 text-[15px] font-bold text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
          >
            {scope === tab.value ? (
              <m.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.15 }}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
