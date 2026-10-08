import { createContext, useContext } from 'react';
import type { User } from './types';

export type SessionStatus = 'loading' | 'authenticated' | 'guest';

export interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  setUser(user: User): void;
  clear(): void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
