import { ArrowLeft, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useSession } from '@/entities/user/use-session';
import { useLogout } from '@/features/auth/logout/use-logout';
import gooseReady from '@/shared/assets/guss_ready.png';
import { Button } from '@/shared/ui/button';

interface HeaderProps {
  title: ReactNode;
  backTo?: string;
}

export function Header({ title, backTo }: HeaderProps) {
  const { user } = useSession();
  const logout = useLogout();
  return (
    <header className="border-b-[3px] border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {backTo ? (
            <Button asChild variant="ghost" className="h-11 rounded-full px-2 text-base font-bold text-primary">
              <Link to={backTo} aria-label="К списку раундов">
                <ArrowLeft className="size-5" strokeWidth={2.5} />
                <span className="hidden sm:inline">Раунды</span>
              </Link>
            </Button>
          ) : (
            <img src={gooseReady} alt="" width={40} height={40} className="size-9 sm:size-10" />
          )}
          <h1 className="truncate text-[22px] sm:text-2xl">{title}</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <span className="max-w-[110px] truncate font-bold sm:max-w-none">{user?.login}</span>
          <Button
            variant="ghost"
            onClick={() => logout.mutate()}
            aria-label="Выйти"
            className="h-11 rounded-full px-2.5 text-base font-bold text-destructive sm:px-3.5"
          >
            <LogOut className="size-5" />
            <span className="hidden sm:inline">Выйти</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
