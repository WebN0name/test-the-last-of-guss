import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/app/providers/session-provider';
import { roundsApi } from '@/entities/round/api';
import type { Round } from '@/entities/round/types';
import { resetServerClock } from '@/shared/server-clock/server-clock';
import { RoundsList } from './rounds-list';

vi.mock('@/entities/round/api', () => ({ roundsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), tap: vi.fn() } }));
vi.mock('@/entities/user/api', () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({ user: { id: 'a', login: 'Admin', role: 'admin' } }),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

class IO {
  static instances: IO[] = [];
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    IO.instances.push(this);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  trigger() {
    this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}
vi.stubGlobal('IntersectionObserver', IO);

const mk = (id: string, startSec: number, endSec: number): Round => ({
  id,
  creator: { id: 'a', login: 'admin' },
  startAt: new Date(Date.now() + startSec * 1000).toISOString(),
  endAt: new Date(Date.now() + endSec * 1000).toISOString(),
  status: 'active',
  createdAt: new Date().toISOString(),
});

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactElement, client: QueryClient = makeClient()) => (
  <QueryClientProvider client={client}>
    <SessionProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </SessionProvider>
  </QueryClientProvider>
);

describe('RoundsList', () => {
  beforeEach(() => {
    resetServerClock();
    IO.instances = [];
    vi.mocked(roundsApi.list).mockReset();
  });

  it('рендерит страницу и подгружает следующую по sentinel', async () => {
    vi.mocked(roundsApi.list)
      .mockResolvedValueOnce({
        items: [mk('r1', -10, 50), mk('r2', 20, 80)],
        nextCursor: 'c1',
        serverTime: new Date().toISOString(),
      })
      .mockResolvedValueOnce({ items: [mk('r3', 100, 160)], nextCursor: null, serverTime: new Date().toISOString() });
    render(wrap(<RoundsList scope="current" />));
    expect(await screen.findAllByRole('link')).toHaveLength(2);
    IO.instances.at(-1)?.trigger();
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(3));
    expect(roundsApi.list).toHaveBeenLastCalledWith({ scope: 'current', cursor: 'c1', limit: 20 });
  });

  it('на вкладке current завершившиеся раунды отфильтрованы', async () => {
    vi.mocked(roundsApi.list).mockResolvedValueOnce({
      items: [mk('old', -100, -1), mk('live', -10, 50)],
      nextCursor: null,
      serverTime: new Date().toISOString(),
    });
    render(wrap(<RoundsList scope="current" />));
    expect(await screen.findAllByRole('link')).toHaveLength(1);
  });

  it('пустой список → сообщение', async () => {
    vi.mocked(roundsApi.list).mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      serverTime: new Date().toISOString(),
    });
    render(wrap(<RoundsList scope="current" />));
    expect(await screen.findByText('Раундов пока нет')).toBeInTheDocument();
  });

  it('ошибка → карточка с «Повторить»', async () => {
    vi.mocked(roundsApi.list).mockRejectedValueOnce(new Error('network'));
    render(wrap(<RoundsList scope="finished" />));
    expect(await screen.findByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('пустая вкладка «Завершённые» — нейтральный текст без кнопки создания', async () => {
    vi.mocked(roundsApi.list).mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      serverTime: new Date().toISOString(),
    });
    render(wrap(<RoundsList scope="finished" />));
    expect(await screen.findByText('Завершённых раундов пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Создать раунд' })).not.toBeInTheDocument();
  });

  it('на current все отфильтрованы, но есть следующая страница — пустота не показывается, догрузка идёт', async () => {
    vi.mocked(roundsApi.list)
      .mockResolvedValueOnce({ items: [mk('old', -100, -1)], nextCursor: 'c1', serverTime: new Date().toISOString() })
      .mockResolvedValueOnce({ items: [mk('live', -10, 50)], nextCursor: null, serverTime: new Date().toISOString() });
    render(wrap(<RoundsList scope="current" />));
    await waitFor(() => expect(IO.instances.length).toBeGreaterThan(0));
    expect(screen.queryByText('Раундов пока нет')).not.toBeInTheDocument();
    IO.instances.at(-1)?.trigger();
    expect(await screen.findAllByRole('link')).toHaveLength(1);
  });

  it('ошибка догрузки: список остаётся, «Повторить» зовёт fetchNextPage', async () => {
    vi.mocked(roundsApi.list)
      .mockResolvedValueOnce({ items: [mk('r1', -10, 50)], nextCursor: 'c1', serverTime: new Date().toISOString() })
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ items: [mk('r2', 20, 80)], nextCursor: null, serverTime: new Date().toISOString() });
    render(wrap(<RoundsList scope="current" />));
    expect(await screen.findAllByRole('link')).toHaveLength(1);
    IO.instances.at(-1)?.trigger();
    const retry = await screen.findByRole('button', { name: 'Повторить' });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    await userEvent.click(retry);
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    expect(roundsApi.list).toHaveBeenLastCalledWith({ scope: 'current', cursor: 'c1', limit: 20 });
  });

  it('сбой фонового опроса не убирает список', async () => {
    const client = makeClient();
    vi.mocked(roundsApi.list)
      .mockResolvedValueOnce({
        items: [mk('r1', -10, 50), mk('r2', 20, 80)],
        nextCursor: null,
        serverTime: new Date().toISOString(),
      })
      .mockRejectedValueOnce(new Error('poll'));
    render(wrap(<RoundsList scope="current" />, client));
    expect(await screen.findAllByRole('link')).toHaveLength(2);
    await act(async () => {
      await client.refetchQueries({ queryKey: ['rounds', 'current'] });
    });
    expect(roundsApi.list).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('тик серверных часов не пересоздаёт IntersectionObserver', async () => {
    const ticks: (() => void)[] = [];
    const realSetInterval = window.setInterval.bind(window);
    const spy = vi.spyOn(window, 'setInterval').mockImplementation(((cb: () => void, ms?: number) => {
      if (ms === 1000) ticks.push(cb);
      return realSetInterval(cb, 1_000_000);
    }) as typeof window.setInterval);
    vi.mocked(roundsApi.list).mockResolvedValueOnce({
      items: [mk('r1', -10, 50)],
      nextCursor: 'c1',
      serverTime: new Date().toISOString(),
    });
    render(wrap(<RoundsList scope="current" />));
    expect(await screen.findAllByRole('link')).toHaveLength(1);
    const created = IO.instances.length;
    expect(ticks.length).toBeGreaterThan(0);
    for (let i = 0; i < 3; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
      act(() => ticks.forEach((t) => t()));
    }
    expect(IO.instances.length).toBe(created);
    spy.mockRestore();
  });
});
