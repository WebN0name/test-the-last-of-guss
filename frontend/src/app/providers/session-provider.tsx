import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '@/entities/user/api';
import type { User } from '@/entities/user/types';
import { SessionContext, type SessionStatus } from '@/entities/user/use-session';
import { onUnauthorized } from '@/shared/api/session-events';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const setUser = useCallback((next: User) => {
    setUserState(next);
    setStatus('authenticated');
  }, []);

  const clear = useCallback(() => {
    setUserState(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const res = await authApi.me();
        if (!cancelled) setUser(res.user);
      } catch {
        if (!cancelled) clear();
      }
    };
    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [setUser, clear]);

  useEffect(
    () =>
      onUnauthorized(() => {
        clear();
        queryClient.clear();
      }),
    [clear, queryClient],
  );

  const value = useMemo(() => ({ status, user, setUser, clear }), [status, user, setUser, clear]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
