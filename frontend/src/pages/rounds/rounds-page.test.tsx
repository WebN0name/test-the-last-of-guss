import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/app/providers/session-provider';
import { roundsApi } from '@/entities/round/api';
import type { Round } from '@/entities/round/types';
import { authApi } from '@/entities/user/api';
import { resetServerClock } from '@/shared/server-clock/server-clock';
import { RoundsPage } from './rounds-page';

vi.mock('@/entities/round/api', () => ({ roundsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), tap: vi.fn() } }));
vi.mock('@/entities/user/api', () => ({ authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() } }));

class IO {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('IntersectionObserver', IO);

const mk = (id: string): Round => ({
  id,
  creator: { id: 'a', login: 'admin' },
  startAt: new Date(Date.now() - 10_000).toISOString(),
  endAt: new Date(Date.now() + 50_000).toISOString(),
  status: 'active',
  createdAt: new Date().toISOString(),
});

const now = () => new Date().toISOString();

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SessionProvider>
        <MemoryRouter initialEntries={['/rounds']}>
          <Routes>
            <Route path="/rounds" element={<RoundsPage />} />
            <Route path="/rounds/:id" element={<p>страница раунда</p>} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe('RoundsPage', () => {
  beforeEach(() => {
    resetServerClock();
    vi.mocked(roundsApi.list).mockReset();
    vi.mocked(roundsApi.create).mockReset();
    vi.mocked(authApi.me).mockResolvedValue({ user: { id: 'a', login: 'Admin', role: 'admin' } });
  });

  it('вкладки шлют свой scope, курсор current не попадает в finished', async () => {
    vi.mocked(roundsApi.list).mockImplementation(async ({ scope }) =>
      scope === 'current'
        ? { items: [mk('c1')], nextCursor: 'cur-1', serverTime: now() }
        : { items: [mk('f1')], nextCursor: null, serverTime: now() },
    );
    renderPage();
    await screen.findAllByRole('link');
    expect(roundsApi.list).toHaveBeenCalledWith({ scope: 'current', cursor: null, limit: 20 });
    await userEvent.click(screen.getByRole('tab', { name: 'Завершённые' }));
    await waitFor(() => expect(roundsApi.list).toHaveBeenCalledWith({ scope: 'finished', cursor: null, limit: 20 }));
    const finishedCalls = vi.mocked(roundsApi.list).mock.calls.filter(([p]) => p.scope === 'finished');
    expect(finishedCalls.every(([p]) => p.cursor === null)).toBe(true);
  });

  it('кнопка «Создать раунд» видна admin', async () => {
    vi.mocked(roundsApi.list).mockResolvedValue({ items: [mk('c1')], nextCursor: null, serverTime: now() });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Создать раунд' })).toBeInTheDocument();
  });

  it('пустая вкладка «Текущие» у admin — одна кнопка «Создать раунд», без дубля в пустой карточке', async () => {
    vi.mocked(roundsApi.list).mockResolvedValue({ items: [], nextCursor: null, serverTime: now() });
    renderPage();
    expect(await screen.findByText('Раундов пока нет')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Создать раунд' })).toHaveLength(1);
  });

  it.each(['survivor', 'nikita'] as const)('кнопка «Создать раунд» скрыта для %s', async (role) => {
    vi.mocked(authApi.me).mockResolvedValue({ user: { id: 'u', login: 'someone', role } });
    vi.mocked(roundsApi.list).mockResolvedValue({ items: [mk('c1')], nextCursor: null, serverTime: now() });
    renderPage();
    await screen.findAllByRole('link');
    await screen.findByText('someone');
    expect(screen.queryByRole('button', { name: 'Создать раунд' })).not.toBeInTheDocument();
  });

  it('двойной клик создаёт один раунд, затем переход на /rounds/:id', async () => {
    vi.mocked(roundsApi.list).mockResolvedValue({ items: [mk('c1')], nextCursor: null, serverTime: now() });
    let resolve: (r: Round) => void = () => undefined;
    vi.mocked(roundsApi.create).mockReturnValue(new Promise<Round>((res) => (resolve = res)));
    renderPage();
    const button = await screen.findByRole('button', { name: 'Создать раунд' });
    await userEvent.dblClick(button);
    expect(roundsApi.create).toHaveBeenCalledTimes(1);
    resolve(mk('new-1'));
    expect(await screen.findByText('страница раунда')).toBeInTheDocument();
    expect(roundsApi.create).toHaveBeenCalledTimes(1);
  });
});
