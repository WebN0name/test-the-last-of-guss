import { useState } from 'react';
import type { RoundScope } from '@/entities/round/types';
import { CreateRoundButton } from '@/features/round/create/create-round-button';
import { Header } from '@/widgets/header/header';
import { RoundsList } from '@/widgets/rounds-list/rounds-list';
import { RoundsTabs } from '@/widgets/rounds-list/rounds-tabs';

export function RoundsPage() {
  const [scope, setScope] = useState<RoundScope>('current');
  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="Раунды" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-5 pb-10 sm:gap-6 sm:pt-8 sm:pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <RoundsTabs scope={scope} onChange={setScope} />
          <CreateRoundButton className="w-full sm:w-auto" />
        </div>
        <RoundsList scope={scope} />
      </main>
    </div>
  );
}
