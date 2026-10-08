import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SOUND_MUTED_STORAGE_KEY } from './sound-config';

async function load() {
  vi.resetModules();
  return import('./sound-muted-store');
}

describe('sound-muted-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('по умолчанию звук включён', async () => {
    const store = await load();
    expect(store.isSoundMuted()).toBe(false);
  });

  it('читает сохранённое значение', async () => {
    window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, '1');
    const store = await load();
    expect(store.isSoundMuted()).toBe(true);
  });

  it('записывает значение и уведомляет подписчиков', async () => {
    const store = await load();
    const listener = vi.fn();
    const unsubscribe = store.subscribeSoundMuted(listener);
    store.setSoundMuted(true);
    expect(store.isSoundMuted()).toBe(true);
    expect(window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY)).toBe('1');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setSoundMuted(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY)).toBe('0');
  });

  it('падение localStorage на чтении и записи не ломает хранилище', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const store = await load();
    expect(store.isSoundMuted()).toBe(false);
    expect(() => store.setSoundMuted(true)).not.toThrow();
    expect(store.isSoundMuted()).toBe(true);
  });
});
