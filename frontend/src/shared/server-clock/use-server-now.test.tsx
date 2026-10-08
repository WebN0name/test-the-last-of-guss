import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerClock, syncServerClock } from './server-clock';
import { useServerNow } from './use-server-now';

describe('useServerNow', () => {
  beforeEach(() => {
    resetServerClock();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('тикает раз в секунду с учётом смещения', () => {
    syncServerClock('2026-10-07T10:00:03.000Z');
    const { result } = renderHook(() => useServerNow());
    expect(result.current).toBe(new Date('2026-10-07T10:00:03.000Z').getTime());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(new Date('2026-10-07T10:00:04.000Z').getTime());
  });
});
