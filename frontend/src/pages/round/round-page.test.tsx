import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { roundsApi } from '@/entities/round/api';
import type { RoundSummary } from '@/entities/round/types';
import { SessionContext } from '@/entities/user/use-session';
import { ApiError } from '@/shared/api/errors';
import { resetServerClock } from '@/shared/server-clock/server-clock';
import { RoundPage } from './round-page';

vi.mock('@/entities/round/api', () => ({
  roundsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), tap: vi.fn() },
}));
vi.mock('@/features/auth/logout/use-logout', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const summary = (startOffset: number, endOffset: number, extra: Partial<RoundSummary> = {}): RoundSummary => ({
  round: {
    id: 'r1',
    creator: { id: 'a', login: 'admin' },
    startAt: iso(startOffset),
    endAt: iso(endOffset),
    status: 'active',
    createdAt: iso(-60_000),
  },
  myScore: { taps: 0, score: 0 },
  serverTime: iso(0),
  ...extra,
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SessionContext.Provider
        value={{
          status: 'authenticated',
          user: { id: 'u', login: 'Иван', role: 'survivor' },
          setUser: vi.fn(),
          clear: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/rounds/r1']}>
          <Routes>
            <Route path="/rounds/:id" element={<RoundPage />} />
          </Routes>
        </MemoryRouter>
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
  return client;
}

describe('RoundPage', () => {
  beforeEach(() => {
    resetServerClock();
    vi.mocked(roundsApi.get).mockReset();
  });

  it('404 — «Такого раунда нет» без повтора', async () => {
    vi.mocked(roundsApi.get).mockRejectedValue(new ApiError(404, 'ROUND_NOT_FOUND', 'x'));
    renderPage();
    expect(await screen.findByText('Такого раунда нет')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull();
    expect(roundsApi.get).toHaveBeenCalledTimes(1);
  });

  it('невалидный id (400 VALIDATION_ERROR) — тоже «Такого раунда нет»', async () => {
    vi.mocked(roundsApi.get).mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'x'));
    renderPage();
    expect(await screen.findByText('Такого раунда нет')).toBeInTheDocument();
    expect(roundsApi.get).toHaveBeenCalledTimes(1);
  });

  it('прочая ошибка — своё состояние с «Повторить»', async () => {
    vi.mocked(roundsApi.get)
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'x'))
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'x'));
    renderPage();
    expect(await screen.findByText('Не удалось загрузить раунд', {}, { timeout: 4000 })).toBeInTheDocument();
    vi.mocked(roundsApi.get).mockResolvedValue(summary(-10_000, 50_000));
    screen.getByRole('button', { name: 'Повторить' }).click();
    expect(await screen.findByRole('button', { name: 'Тапнуть гуся' })).toBeInTheDocument();
  });

  it('неудачный фоновый refetch не размонтирует плату', async () => {
    vi.mocked(roundsApi.get).mockResolvedValueOnce(summary(-10_000, 50_000));
    const client = renderPage();
    expect(await screen.findByRole('button', { name: 'Тапнуть гуся' })).toBeInTheDocument();
    vi.mocked(roundsApi.get).mockRejectedValue(new ApiError(500, 'INTERNAL', 'x'));
    await client.refetchQueries({ queryKey: ['round', 'r1'] });
    expect(screen.getByRole('button', { name: 'Тапнуть гуся' })).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить раунд')).toBeNull();
  });

  it('завершённый раунд без total — подсчёт, затем итоги и опрос прекращается', async () => {
    vi.mocked(roundsApi.get)
      .mockResolvedValueOnce(summary(-100_000, -10_000))
      .mockResolvedValue(summary(-100_000, -10_000, { total: 42, winner: null }));
    renderPage();
    expect(await screen.findByText(/Идёт подсчёт/)).toBeInTheDocument();
    expect(await screen.findByText('Победителя нет')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).getByRole('link', {
        name: 'К списку раундов',
      }),
    ).toBeInTheDocument();
    const calls = vi.mocked(roundsApi.get).mock.calls.length;
    await new Promise((r) => setTimeout(r, 300));
    expect(vi.mocked(roundsApi.get).mock.calls.length).toBe(calls);
  });

  it('до итогов таблицы участников нет, после итогов она есть', async () => {
    vi.mocked(roundsApi.get)
      .mockResolvedValueOnce(summary(-100_000, -10_000))
      .mockResolvedValue(
        summary(-100_000, -10_000, {
          total: 42,
          winner: { userId: 'u', login: 'Иван', score: 42 },
          participants: [{ place: 1, userId: 'u', login: 'Иван', score: 42, isMe: true }],
        }),
      );
    renderPage();
    expect(await screen.findByText(/Идёт подсчёт/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('(это вы)')).toBeInTheDocument();
  });
});
