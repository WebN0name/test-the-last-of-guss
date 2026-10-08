import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/entities/user/api';
import { useSession } from '@/entities/user/use-session';
import { ApiError } from '@/shared/api/errors';
import { emitUnauthorized } from '@/shared/api/session-events';
import { SessionProvider } from './session-provider';

vi.mock('@/entities/user/api', () => ({ authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() } }));

function Probe() {
  const { status, user } = useSession();
  return (
    <div data-testid="probe">
      {status}:{user?.login ?? '-'}
    </div>
  );
}

let queryClient: QueryClient;

function renderSession(children: ReactNode = <Probe />) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>,
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it('me → authenticated', async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({ user: { id: '1', login: 'Иван', role: 'survivor' } });
    renderSession();
    expect(screen.getByTestId('probe').textContent).toBe('loading:-');
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('authenticated:Иван'));
  });

  it('me 401 → guest', async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'x'));
    renderSession();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('guest:-'));
  });

  it('emitUnauthorized сбрасывает сессию', async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({ user: { id: '1', login: 'Иван', role: 'survivor' } });
    renderSession();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('authenticated:Иван'));
    emitUnauthorized();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('guest:-'));
  });

  it('повторный emitUnauthorized безопасен и не вызывает запросов', async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({ user: { id: '1', login: 'Иван', role: 'survivor' } });
    renderSession();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('authenticated:Иван'));
    emitUnauthorized();
    emitUnauthorized();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('guest:-'));
    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(authApi.logout).not.toHaveBeenCalled();
  });

  it('emitUnauthorized очищает кэш запросов, как logout', async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({ user: { id: '1', login: 'Иван', role: 'survivor' } });
    queryClient.setQueryData(['round', 'r1'], { secret: true });
    renderSession();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('authenticated:Иван'));
    emitUnauthorized();
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('guest:-'));
    expect(queryClient.getQueryData(['round', 'r1'])).toBeUndefined();
  });
});
