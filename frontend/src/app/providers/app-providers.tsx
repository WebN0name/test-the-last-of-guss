import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig, domMax } from 'motion/react';
import type { ReactNode } from 'react';
import { Toaster } from '@/shared/ui/sonner';
import { queryClient } from './query-client';
import { SessionProvider } from './session-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: 'easeOut' }}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>{children}</SessionProvider>
          <Toaster position="top-center" duration={4000} />
        </QueryClientProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
