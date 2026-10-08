import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAP_REQUEST_TIMEOUT_MS } from '@/shared/config/constants';
import { resetServerClock } from '@/shared/server-clock/server-clock';
import { roundsApi } from './api';

const tapOk = (): Response =>
  new Response(
    JSON.stringify({
      taps: 4,
      score: 4,
      serverTime: '2026-10-07T10:00:00.000Z',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );

const hanging = (input: RequestInfo | URL): Promise<Response> =>
  new Promise((_, reject) => {
    const signal = (input as Request).signal;
    signal.addEventListener('abort', () => reject(signal.reason));
  });

describe('roundsApi.tap', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    resetServerClock();
  });

  it('зависший запрос обрывается через 5 с ошибкой, следующий тап уходит', async () => {
    fetchMock.mockImplementationOnce(hanging).mockResolvedValueOnce(tapOk());
    let settled = false;
    const first = roundsApi.tap('r1', 3);
    const settle = async (): Promise<'resolved' | 'rejected'> => {
      try {
        await first;
        return 'resolved';
      } catch {
        return 'rejected';
      } finally {
        settled = true;
      }
    };
    const outcome = settle();

    await vi.advanceTimersByTimeAsync(TAP_REQUEST_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toBe('rejected');

    await expect(roundsApi.tap('r1', 1)).resolves.toEqual({
      taps: 4,
      score: 4,
      serverTime: '2026-10-07T10:00:00.000Z',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('успешный ответ не оставляет таймер отмены', async () => {
    fetchMock.mockResolvedValueOnce(tapOk());
    await roundsApi.tap('r1', 1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
