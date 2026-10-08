import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOffsetMs, resetServerClock, serverNow, syncServerClock } from './server-clock';

describe('server clock', () => {
  beforeEach(() => {
    resetServerClock();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T10:00:00.000Z'));
  });

  it('без синхронизации смещение 0', () => {
    expect(getOffsetMs()).toBe(0);
    expect(serverNow()).toBe(Date.now());
  });

  it('считает смещение от времени получения', () => {
    syncServerClock('2026-10-07T10:00:05.000Z', Date.now());
    expect(getOffsetMs()).toBe(5000);
    expect(serverNow()).toBe(Date.now() + 5000);
  });

  it('следующая синхронизация перезаписывает смещение', () => {
    syncServerClock('2026-10-07T10:00:05.000Z');
    syncServerClock('2026-10-07T09:59:59.000Z');
    expect(getOffsetMs()).toBe(-1000);
  });

  it('мусорная дата игнорируется', () => {
    syncServerClock('2026-10-07T10:00:05.000Z');
    syncServerClock('not-a-date');
    expect(getOffsetMs()).toBe(5000);
  });
});
