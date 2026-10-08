import { useCallback, useSyncExternalStore } from 'react';
import { isSoundMuted, setSoundMuted, subscribeSoundMuted } from './sound-muted-store';

export function useSoundMuted() {
  const muted = useSyncExternalStore(subscribeSoundMuted, isSoundMuted, () => false);
  const toggle = useCallback(() => setSoundMuted(!isSoundMuted()), []);
  return { muted, toggle };
}
