import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '@/entities/user/use-session';
import { Skeleton } from '@/shared/ui/skeleton';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }
  if (status === 'guest') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
