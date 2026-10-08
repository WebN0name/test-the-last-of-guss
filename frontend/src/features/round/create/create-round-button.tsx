import { Loader2, Plus } from 'lucide-react';
import { useSession } from '@/entities/user/use-session';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { useCreateRound } from './use-create-round';

export function CreateRoundButton({ className }: { className?: string }) {
  const { user } = useSession();
  const { create, busy } = useCreateRound();
  if (user?.role !== 'admin') return null;
  return (
    <Button
      onClick={create}
      disabled={busy}
      className={cn('clay-press h-11 rounded-full text-base font-bold shadow-clay', className)}
    >
      {busy ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" strokeWidth={2.5} />}
      Создать раунд
    </Button>
  );
}
