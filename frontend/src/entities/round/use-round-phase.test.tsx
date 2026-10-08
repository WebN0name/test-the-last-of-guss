import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COUNTING_DELAY_MS } from '@/shared/config/constants';
import { resetServerClock, syncServerClock } from '@/shared/server-clock/server-clock';
import type { Round } from './types';
import { useRoundPhase } from './use-round-phase';

const round: Round = {
  id: 'r',
  creator: { id: 'a', login: 'admin' },
  startAt: '2026-10-07T10:00:05.000Z',
  endAt: '2026-10-07T10:00:08.000Z',
  status: 'cooldown',
  createdAt: '2026-10-07T10:00:00.000Z',
};

describe('useRoundPhase', () => {
  beforeEach(() => {
    resetServerClock();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T10:00:03.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('проходит cooldown → active → counting → finished по тикам', () => {
    const { result } = renderHook(() => useRoundPhase(round));
    expect(result.current.phase).toBe('cooldown');
    expect(result.current.msToStart).toBe(2000);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.phase).toBe('active');
    expect(result.current.msToEnd).toBe(3000);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.phase).toBe('counting');
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.phase).toBe('finished');
  });

  it('за 1,7 с до старта: через 1,7 с фаза active без ожидания секундного тика', () => {
    vi.setSystemTime(new Date(Date.parse(round.startAt) - 1700));
    const { result } = renderHook(() => useRoundPhase(round));
    expect(result.current.phase).toBe('cooldown');
    act(() => vi.advanceTimersByTime(1699));
    expect(result.current.phase).toBe('cooldown');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.phase).toBe('active');
  });

  it('за 1,3 с до конца: через 1,3 с фаза counting', () => {
    vi.setSystemTime(new Date(Date.parse(round.endAt) - 1300));
    const { result } = renderHook(() => useRoundPhase(round));
    expect(result.current.phase).toBe('active');
    act(() => vi.advanceTimersByTime(1299));
    expect(result.current.phase).toBe('active');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.phase).toBe('counting');
  });

  it('counting → finished ровно по endAt + COUNTING_DELAY_MS', () => {
    vi.setSystemTime(new Date(Date.parse(round.endAt) + 100));
    const { result } = renderHook(() => useRoundPhase(round));
    expect(result.current.phase).toBe('counting');
    act(() => vi.advanceTimersByTime(COUNTING_DELAY_MS - 101));
    expect(result.current.phase).toBe('counting');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.phase).toBe('finished');
  });

  it('граница считается от серверного времени', () => {
    syncServerClock('2026-10-07T10:00:04.500Z');
    const { result } = renderHook(() => useRoundPhase(round));
    expect(result.current.phase).toBe('cooldown');
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.phase).toBe('active');
  });

  it('cooldown и active: один секундный интервал и один таймер границы', () => {
    renderHook(() => useRoundPhase(round));
    expect(vi.getTimerCount()).toBe(2);
  });

  it('counting: без секундного тика, только таймер границы', () => {
    vi.setSystemTime(new Date(Date.parse(round.endAt) + 100));
    const { result } = renderHook(() => useRoundPhase(round));
    const before = result.current.now;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.now).toBe(before);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('finished: таймеров нет', () => {
    vi.setSystemTime(new Date(Date.parse(round.endAt) + COUNTING_DELAY_MS));
    const { result } = renderHook(() => useRoundPhase(round));
    expect(result.current.phase).toBe('finished');
    expect(vi.getTimerCount()).toBe(0);
  });
});
