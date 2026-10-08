import { SOUND_MUTED_STORAGE_KEY } from './sound-config';

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function readStored(): boolean {
  try {
    return window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isSoundMuted(): boolean {
  if (cached === null) cached = readStored();
  return cached;
}

function persist(muted: boolean): void {
  try {
    window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    return;
  }
}

export function setSoundMuted(muted: boolean): void {
  cached = muted;
  persist(muted);
  listeners.forEach((listener) => listener());
}

export function subscribeSoundMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
