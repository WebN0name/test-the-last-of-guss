import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '@/entities/user/use-session';

export function RequireGuest({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'loading') return null;
  if (status === 'authenticated') return <Navigate to="/rounds" replace />;
  return <>{children}</>;
}
