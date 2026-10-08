import createClient, { type FetchResponse, type Middleware } from 'openapi-fetch';
import { ApiError, isErrorBody } from './errors';
import type { paths } from './schema';
import { emitUnauthorized } from './session-events';

const REFRESH_PATH = '/api/auth/refresh';
const NO_RETRY = new Set(['/api/auth/login', REFRESH_PATH, '/api/auth/logout']);

type RefreshOutcome = 'ok' | 'unauthorized' | 'failed';

const clones = new WeakMap<Request, Request>();
let refreshing: Promise<RefreshOutcome> | null = null;

async function requestRefresh(): Promise<RefreshOutcome> {
  try {
    const res = await globalThis.fetch(
      new Request(new URL(REFRESH_PATH, window.location.origin), { method: 'POST', credentials: 'same-origin' }),
    );
    if (res.ok) return 'ok';
    return res.status === 401 || res.status === 403 ? 'unauthorized' : 'failed';
  } catch {
    return 'failed';
  }
}

async function runRefresh(): Promise<RefreshOutcome> {
  try {
    const outcome = await requestRefresh();
    if (outcome === 'unauthorized') emitUnauthorized();
    return outcome;
  } finally {
    refreshing = null;
  }
}

function refreshSession(): Promise<RefreshOutcome> {
  refreshing ??= runRefresh();
  return refreshing;
}

function abortion(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    clones.set(request, request.clone());
    return undefined;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return response;
    const path = new URL(request.url).pathname;
    if (NO_RETRY.has(path)) return response;

    const outcome = await Promise.race([refreshSession(), abortion(request.signal)]);
    const retry = clones.get(request);
    if (outcome !== 'ok' || !retry) return response;
    const second = await globalThis.fetch(retry);
    if (second.status === 401) emitUnauthorized();
    return second;
  },
};

export const api = createClient<paths>({
  baseUrl: window.location.origin,
  credentials: 'same-origin',
  fetch: (req) => globalThis.fetch(req),
});
api.use(authMiddleware);

type AnyResult = { data?: unknown; error?: unknown; response: Response };

function toApiError(result: AnyResult): ApiError {
  const status = result.response.status;
  const body = result.error;
  if (isErrorBody(body)) {
    return new ApiError(status, body.code, Array.isArray(body.message) ? body.message.join('; ') : body.message);
  }
  return new ApiError(status, 'HTTP_ERROR', `Request failed with status ${status}`);
}

export function unwrap<T extends AnyResult>(result: T): NonNullable<T['data']> {
  if (!result.response.ok || result.error !== undefined || result.data === undefined) throw toApiError(result);
  return result.data as NonNullable<T['data']>;
}

export function unwrapEmpty(result: AnyResult): void {
  if (!result.response.ok || result.error !== undefined) throw toApiError(result);
}

export type { FetchResponse };
