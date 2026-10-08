import { api, unwrap } from '@/shared/api/client';
import { TAP_REQUEST_TIMEOUT_MS } from '@/shared/config/constants';
import { syncServerClock } from '@/shared/server-clock/server-clock';
import type { Round, RoundList, RoundScope, RoundSummary, TapResponse } from './types';

export interface ListParams {
  scope: RoundScope;
  cursor: string | null;
  limit: number;
}

export const roundsApi = {
  async list(params: ListParams): Promise<RoundList> {
    const query: { scope: RoundScope; limit: number; cursor?: string } = {
      scope: params.scope,
      limit: params.limit,
    };
    if (params.cursor) query.cursor = params.cursor;
    const data = unwrap(await api.GET('/api/rounds', { params: { query } }));
    syncServerClock(data.serverTime);
    return data;
  },

  async get(id: string): Promise<RoundSummary> {
    const data = unwrap(await api.GET('/api/rounds/{id}', { params: { path: { id } } }));
    syncServerClock(data.serverTime);
    return data;
  },

  async create(): Promise<Round> {
    const data = unwrap(await api.POST('/api/rounds'));
    syncServerClock(data.serverTime);
    return data.round;
  },

  async tap(id: string, count: number): Promise<TapResponse> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TAP_REQUEST_TIMEOUT_MS);
    try {
      const data = unwrap(
        await api.POST('/api/rounds/{id}/taps', {
          params: { path: { id } },
          body: { count },
          signal: controller.signal,
        }),
      );
      syncServerClock(data.serverTime);
      return data;
    } finally {
      window.clearTimeout(timer);
    }
  },
};
