import { useEffect, useState } from 'react';
import { serverNow } from './server-clock';

export function useServerNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
