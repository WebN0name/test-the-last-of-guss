import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { roundsApi } from '@/entities/round/api';
import type { RoundSummary, TapResponse } from '@/entities/round/types';
import { scoreFor } from '@/entities/score/scoring-rule';
import { ApiError } from '@/shared/api/errors';
import { resetServerClock } from '@/shared/server-clock/server-clock';
import { playGooseSound } from './goose-sound';
import { useTapController } from './use-tap-controller';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('./goose-sound', () => ({ playGooseSound: vi.fn() }));
vi.mock('@/entities/round/api', () => ({ roundsApi: { tap: vi.fn(), get: vi.fn() } }));

const tapMock = vi.mocked(roundsApi.tap);
const getMock = vi.mocked(roundsApi.get);

const START = '2026-10-07T10:00:00.000Z';
const END = '2026-10-07T10:00:30.000Z';

interface Deferred {
  count: number;
  resolve: (taps: number) => void;
  reject: (error: unknown) => void;
}

let calls: Deferred[];

function tapResponse(taps: number): TapResponse {
  return { taps, score: scoreFor(taps), serverTime: '2026-10-07T10:00:10.000Z' };
}

function summary(taps: number): RoundSummary {
  return { myScore: { taps, score: scoreFor(taps) } } as RoundSummary;
}

function setup(opts: { isNikita?: boolean; initialTaps?: number } = {}) {
  const taps = opts.initialTaps ?? 0;
  return renderHook(() =>
    useTapController({
      roundId: 'r',
      initial: { taps, score: scoreFor(taps) },
      startAt: START,
      endAt: END,
      isNikita: opts.isNikita ?? false,
    }),
  );
}

const respond = (index: number, taps: number) => act(async () => calls[index]!.resolve(taps));
const fail = (index: number, error: unknown) => act(async () => calls[index]!.reject(error));

describe('useTapController', () => {
  beforeEach(() => {
    resetServerClock();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T10:00:10.000Z'));
    calls = [];
    tapMock.mockImplementation(
      (_id, count) =>
        new Promise<TapResponse>((resolve, reject) => {
          calls.push({ count, resolve: (taps) => resolve(tapResponse(taps)), reject });
        }),
    );
    getMock.mockResolvedValue(summary(0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('клик через 1 мс после endAt игнорируется, до endAt принимается', async () => {
    const { result } = setup();
    vi.setSystemTime(new Date(Date.parse(END) - 1));
    await act(async () => result.current.tap());
    expect(result.current.taps).toBe(1);
    vi.setSystemTime(new Date(Date.parse(END) + 1));
    await act(async () => {
      result.current.tap();
      result.current.tap();
    });
    expect(result.current.taps).toBe(1);
    expect(result.current.score).toBe(1);
    expect(calls).toHaveLength(1);
  });

  it('звук играет на принятый тап в активной фазе, в том числе у Никиты', async () => {
    const { result } = setup();
    await act(async () => result.current.tap());
    expect(playGooseSound).toHaveBeenCalledTimes(1);
    const nikita = setup({ isNikita: true });
    await act(async () => nikita.result.current.tap());
    expect(playGooseSound).toHaveBeenCalledTimes(2);
  });

  it('звука нет в cooldown и после endAt', async () => {
    const { result } = setup();
    vi.setSystemTime(new Date(Date.parse(START) - 1));
    await act(async () => result.current.tap());
    vi.setSystemTime(new Date(Date.parse(END)));
    await act(async () => result.current.tap());
    expect(playGooseSound).not.toHaveBeenCalled();
  });

  it('клик до startAt игнорируется', async () => {
    const { result } = setup();
    vi.setSystemTime(new Date(Date.parse(START) - 1));
    await act(async () => result.current.tap());
    expect(result.current.taps).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('у Никиты запрос уходит, всплывающих очков нет, счёт нулевой', async () => {
    const { result } = setup({ isNikita: true });
    await act(async () => result.current.tap());
    expect(tapMock).toHaveBeenCalledWith('r', 1);
    await respond(0, 0);
    expect(result.current.pops).toEqual([]);
    expect(result.current.score).toBe(0);
    expect(result.current.taps).toBe(0);
  });

  it('50 быстрых кликов при медленном ответе уходят батчами 1/20/20/9 без потерь', async () => {
    const { result } = setup();
    await act(async () => result.current.tap());
    await act(async () => {
      for (let i = 0; i < 49; i++) result.current.tap();
    });
    expect(calls.map((c) => c.count)).toEqual([1]);
    expect(result.current.taps).toBe(50);
    await respond(0, 1);
    expect(calls.map((c) => c.count)).toEqual([1, 20]);
    await respond(1, 21);
    expect(calls.map((c) => c.count)).toEqual([1, 20, 20]);
    await respond(2, 41);
    expect(calls.map((c) => c.count)).toEqual([1, 20, 20, 9]);
    expect(result.current.taps).toBe(50);
    await respond(3, 50);
    expect(result.current.taps).toBe(50);
    expect(result.current.score).toBe(scoreFor(50));
    expect(calls).toHaveLength(4);
  });

  it('успех с остатком запускает второй запрос', async () => {
    const { result } = setup();
    await act(async () => result.current.tap());
    await act(async () => {
      result.current.tap();
      result.current.tap();
    });
    expect(calls).toHaveLength(1);
    await respond(0, 1);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.count).toBe(2);
  });

  it('ответ сервера отличается от оптимистичного: серверное плюс накопленное', async () => {
    const { result } = setup();
    await act(async () => result.current.tap());
    await act(async () => {
      result.current.tap();
      result.current.tap();
    });
    await respond(0, 4);
    expect(result.current.taps).toBe(6);
    expect(result.current.score).toBe(scoreFor(6));
    await respond(1, 6);
    expect(result.current.taps).toBe(6);
  });

  it('409 посреди серии: откат, GET, контроллер продолжает отправлять', async () => {
    getMock.mockResolvedValue(summary(7));
    const { result } = setup({ initialTaps: 7 });
    await act(async () => result.current.tap());
    await act(async () => {
      result.current.tap();
      result.current.tap();
    });
    await fail(0, new ApiError(409, 'ROUND_NOT_ACTIVE', 'x'));
    expect(getMock).toHaveBeenCalledWith('r');
    expect(result.current.taps).toBe(7);
    expect(toast.error).toHaveBeenCalledWith('Тапы не засчитаны: раунд не активен или слишком частые тапы.', {
      id: 'tap-error',
    });
    await act(async () => result.current.tap());
    expect(calls).toHaveLength(2);
    expect(calls[1]!.count).toBe(1);
    await respond(1, 8);
    expect(result.current.taps).toBe(8);
  });

  it('сетевая ошибка: откат, GET, продолжение отправки', async () => {
    const { result } = setup();
    await act(async () => result.current.tap());
    await fail(0, new TypeError('network'));
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(result.current.taps).toBe(0);
    expect(toast.error).toHaveBeenCalledWith('Сеть недоступна. Попробуй ещё раз.', { id: 'tap-error' });
    await act(async () => result.current.tap());
    expect(calls).toHaveLength(2);
  });

  it('таймаут запроса тапа: откат, GET, продолжение отправки', async () => {
    const { result } = setup();
    await act(async () => result.current.tap());
    await fail(0, new DOMException('timeout', 'AbortError'));
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Сеть недоступна. Попробуй ещё раз.', { id: 'tap-error' });
    await act(async () => result.current.tap());
    expect(calls).toHaveLength(2);
  });

  it('400 VALIDATION_ERROR тапа показывает текст про тапы, а не про имя и пароль', async () => {
    const { result } = setup();
    await act(async () => result.current.tap());
    await fail(0, new ApiError(400, 'VALIDATION_ERROR', 'x'));
    expect(toast.error).toHaveBeenCalledWith('Тапы не приняты: сервер отклонил запрос. Обнови страницу.', {
      id: 'tap-error',
    });
  });

  it('ответ тапа раньше ответа GET: GET не перетирает счёт', async () => {
    let resolveGet: (value: RoundSummary) => void = () => undefined;
    getMock.mockReturnValue(new Promise<RoundSummary>((resolve) => (resolveGet = resolve)));
    const { result } = setup();
    await act(async () => result.current.tap());
    await fail(0, new TypeError('network'));
    await act(async () => result.current.tap());
    await respond(1, 5);
    await act(async () => resolveGet(summary(2)));
    expect(result.current.taps).toBe(5);
  });

  it('GET во время полёта: не применяется, счёт ждёт ответа тапа', async () => {
    let resolveGet: (value: RoundSummary) => void = () => undefined;
    getMock.mockReturnValue(new Promise<RoundSummary>((resolve) => (resolveGet = resolve)));
    const { result } = setup();
    await act(async () => result.current.tap());
    await fail(0, new TypeError('network'));
    await act(async () => result.current.tap());
    expect(result.current.taps).toBe(1);
    await act(async () => resolveGet(summary(2)));
    expect(result.current.taps).toBe(1);
    await respond(1, 3);
    expect(result.current.taps).toBe(3);
  });

  it('GET раньше следующего тапа: применяется сразу', async () => {
    getMock.mockResolvedValue(summary(2));
    const { result } = setup();
    await act(async () => result.current.tap());
    await fail(0, new TypeError('network'));
    expect(result.current.taps).toBe(2);
  });

  it('сбой GET не оставляет resync навсегда: повтор при следующей ошибке', async () => {
    getMock.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(summary(9));
    const { result } = setup();
    await act(async () => result.current.tap());
    await fail(0, new TypeError('network'));
    await act(async () => result.current.tap());
    await fail(1, new TypeError('network'));
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(result.current.taps).toBe(9);
  });

  it('накопленное отправляется после закрытия окна кликов', async () => {
    const { result } = setup();
    vi.setSystemTime(new Date(Date.parse(END) - 5));
    await act(async () => result.current.tap());
    await act(async () => {
      result.current.tap();
      result.current.tap();
    });
    vi.setSystemTime(new Date(Date.parse(END) + 500));
    await act(async () => result.current.tap());
    await respond(0, 1);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.count).toBe(2);
    await respond(1, 3);
    expect(result.current.taps).toBe(3);
  });

  it('клик сразу после ответа не приводит к повторной отправке уже отправленного', async () => {
    const { result } = setup();
    await act(async () => {
      for (let i = 0; i < 3; i++) result.current.tap();
    });
    expect(calls.map((c) => c.count)).toEqual([3]);
    await act(async () => {
      calls[0]!.resolve(3);
      await Promise.resolve();
      await Promise.resolve();
      result.current.tap();
    });
    expect(calls.map((c) => c.count)).toEqual([3, 1]);
    await respond(1, 4);
    expect(calls.map((c) => c.count)).toEqual([3, 1]);
    expect(result.current.taps).toBe(4);
  });
});
