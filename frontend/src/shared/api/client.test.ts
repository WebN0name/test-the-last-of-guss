import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, unwrap, unwrapEmpty } from './client';
import { ApiError } from './errors';
import { onUnauthorized } from './session-events';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const unauthorized = (): Response => json(401, { statusCode: 401, code: 'UNAUTHORIZED', message: 'x' });
const internal = (): Response => json(502, { statusCode: 502, code: 'INTERNAL', message: 'x' });
const me = (): Response => json(200, { user: { id: '1', login: 'a', role: 'admin' } });
const session = (): Response => json(200, { user: { id: '1', login: 'a', role: 'admin' }, created: false });

describe('api client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const listener = vi.fn();
  let off: () => void = () => undefined;

  const pathOf = (index: number): string => new URL((fetchMock.mock.calls[index][0] as Request).url).pathname;
  const refreshCount = (): number => fetchMock.mock.calls.filter((_, i) => pathOf(i) === '/api/auth/refresh').length;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    off = onUnauthorized(listener);
  });

  afterEach(() => {
    off();
    vi.unstubAllGlobals();
  });

  it('при 401 делает refresh и повторяет исходный запрос с тем же телом и Content-Type', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(session())
      .mockResolvedValueOnce(json(200, { taps: 3, score: 3, serverTime: '2026-10-07T10:00:00.000Z' }));

    const result = await api.POST('/api/rounds/{id}/taps', { params: { path: { id: 'r1' } }, body: { count: 3 } });
    expect(result.data).toEqual({ taps: 3, score: 3, serverTime: '2026-10-07T10:00:00.000Z' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshReq = fetchMock.mock.calls[1][0] as Request;
    expect(new URL(refreshReq.url).pathname).toBe('/api/auth/refresh');
    expect(refreshReq.headers.get('content-type')).toBeNull();
    const retryReq = fetchMock.mock.calls[2][0] as Request;
    expect(retryReq.headers.get('content-type')).toContain('application/json');
    expect(await retryReq.clone().text()).toBe(JSON.stringify({ count: 3 }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('повтор после успешного refresh снова 401 -> один emitUnauthorized и один refresh', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(session())
      .mockResolvedValueOnce(unauthorized());
    const result = await api.GET('/api/auth/me');
    expect(result.response.status).toBe(401);
    expect(refreshCount()).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refresh ответил 401 -> emitUnauthorized, исходный 401 возвращается', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());
    const result = await api.GET('/api/auth/me');
    expect(result.response.status).toBe(401);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('три параллельных запроса и refresh 401 -> один refresh и один emitUnauthorized', async () => {
    fetchMock.mockImplementation(async (input) => {
      if (new URL((input as Request).url).pathname === '/api/auth/refresh') {
        await new Promise((r) => setTimeout(r, 10));
      }
      return unauthorized();
    });
    const results = await Promise.all([api.GET('/api/auth/me'), api.GET('/api/auth/me'), api.GET('/api/auth/me')]);
    expect(results.map((r) => r.response.status)).toEqual([401, 401, 401]);
    expect(refreshCount()).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('refresh ответил 502 -> сессия не сбрасывается, вызывающий получает ApiError 401, следующий запрос снова делает refresh', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(internal())
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(internal());

    const first = await api.GET('/api/auth/me');
    expect(() => unwrap(first)).toThrow(ApiError);
    try {
      unwrap(first);
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
      expect((e as ApiError).code).toBe('UNAUTHORIZED');
    }
    expect(listener).not.toHaveBeenCalled();

    await api.GET('/api/auth/me');
    expect(refreshCount()).toBe(2);
    expect(listener).not.toHaveBeenCalled();
  });

  it('refresh бросает сетевую ошибку -> сессия не сбрасывается, следующий запрос снова делает refresh', async () => {
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(unauthorized())
      .mockRejectedValueOnce(new TypeError('network'));

    const first = await api.GET('/api/auth/me');
    expect(first.response.status).toBe(401);
    expect(listener).not.toHaveBeenCalled();

    await api.GET('/api/auth/me');
    expect(refreshCount()).toBe(2);
    expect(listener).not.toHaveBeenCalled();
  });

  it('параллельные 401 вызывают один refresh, все запросы получают 200', async () => {
    let refreshed = false;
    fetchMock.mockImplementation(async (input) => {
      if (new URL((input as Request).url).pathname === '/api/auth/refresh') {
        await new Promise((r) => setTimeout(r, 10));
        refreshed = true;
        return session();
      }
      return refreshed ? me() : unauthorized();
    });
    const results = await Promise.all([api.GET('/api/auth/me'), api.GET('/api/auth/me'), api.GET('/api/auth/me')]);
    expect(results.map((r) => r.response.status)).toEqual([200, 200, 200]);
    expect(refreshCount()).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(listener).not.toHaveBeenCalled();
  });

  it('отмена запроса во время зависшего refresh обрывает ожидание', async () => {
    let finishRefresh: (res: Response) => void = () => undefined;
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockReturnValueOnce(new Promise<Response>((resolve) => (finishRefresh = resolve)));
    const controller = new AbortController();
    const pending = api.POST('/api/rounds/{id}/taps', {
      params: { path: { id: 'r1' } },
      body: { count: 1 },
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(refreshCount()).toBe(1));
    controller.abort();
    await expect(pending).rejects.toThrow();
    finishRefresh(internal());
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('login при 401 не повторяется', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'x' }));
    const result = await api.POST('/api/auth/login', { body: { login: 'Иван', password: 'wrong-1' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh и logout при 401 не повторяются', async () => {
    fetchMock.mockImplementation(async () => unauthorized());
    await api.POST('/api/auth/refresh');
    await api.POST('/api/auth/logout');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pathOf(0)).toBe('/api/auth/refresh');
    expect(pathOf(1)).toBe('/api/auth/logout');
  });

  it('unwrap бросает ApiError с кодом и HTTP-статусом ответа', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { statusCode: 409, code: 'ROUND_NOT_ACTIVE', message: 'x' }));
    const result = await api.POST('/api/rounds/{id}/taps', { params: { path: { id: 'r1' } }, body: { count: 1 } });
    expect(() => unwrap(result)).toThrow(ApiError);
    try {
      unwrap(result);
    } catch (e) {
      expect((e as ApiError).code).toBe('ROUND_NOT_ACTIVE');
      expect((e as ApiError).status).toBe(409);
    }
  });

  it('unwrap: тело без корректного кода даёт HTTP_ERROR со статусом ответа', async () => {
    fetchMock.mockResolvedValueOnce(json(500, { statusCode: 'x', code: 5, message: 1 }));
    const result = await api.GET('/api/auth/me');
    expect(() => unwrap(result)).toThrow(ApiError);
    try {
      unwrap(result);
    } catch (e) {
      expect((e as ApiError).code).toBe('HTTP_ERROR');
      expect((e as ApiError).status).toBe(500);
    }
  });

  it('unwrapEmpty не бросает на 204 и бросает на ошибке', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json(403, { statusCode: 403, code: 'FORBIDDEN', message: 'x' }));
    const ok = await api.POST('/api/auth/logout');
    expect(() => unwrapEmpty(ok)).not.toThrow();
    const failed = await api.POST('/api/auth/logout');
    expect(() => unwrapEmpty(failed)).toThrow(ApiError);
  });
});
