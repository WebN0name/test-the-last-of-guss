import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { roundsApi } from '@/entities/round/api';
import type { RoundSummary } from '@/entities/round/types';
import type { User } from '@/entities/user/types';
import { SessionContext } from '@/entities/user/use-session';
import { resetServerClock } from '@/shared/server-clock/server-clock';
import { RoundBoard } from './round-board';

vi.mock('@/entities/round/api', () => ({
  roundsApi: { get: vi.fn(), tap: vi.fn() },
}));

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const active: RoundSummary = {
  round: {
    id: 'r1',
    creator: { id: 'a', login: 'admin' },
    startAt: iso(-10_000),
    endAt: iso(50_000),
    status: 'active',
    createdAt: iso(-60_000),
  },
  myScore: { taps: 0, score: 0 },
  serverTime: iso(0),
};

function renderBoard(role: User['role']) {
  render(
    <SessionContext.Provider
      value={{
        status: 'authenticated',
        user: { id: 'u', login: 'x', role },
        setUser: vi.fn(),
        clear: vi.fn(),
      }}
    >
      <MemoryRouter>
        <RoundBoard summary={active} />
      </MemoryRouter>
    </SessionContext.Provider>,
  );
}

describe('RoundBoard', () => {
  beforeEach(() => {
    resetServerClock();
    vi.mocked(roundsApi.tap).mockReset();
    vi.mocked(roundsApi.tap).mockResolvedValue({
      taps: 1,
      score: 1,
      serverTime: iso(0),
    });
  });

  it('у выжившего тап показывает +1 и растит счёт', async () => {
    renderBoard('survivor');
    await userEvent.click(screen.getByRole('button', { name: 'Тапнуть гуся' }));
    expect(await screen.findByText('+1')).toBeInTheDocument();
    expect(screen.getByText(/Тапов: 1/)).toBeInTheDocument();
  });

  it('пробел тапает гуся, даже когда фокус не на нём', async () => {
    renderBoard('survivor');
    await screen.findByRole('button', { name: 'Тапнуть гуся' });
    await userEvent.keyboard(' ');
    expect(await screen.findByText('+1')).toBeInTheDocument();
    expect(screen.getByText(/Тапов: 1/)).toBeInTheDocument();
  });

  it('у Никиты тап уходит на сервер, но всплывающих очков и счёта нет', async () => {
    renderBoard('nikita');
    await userEvent.click(screen.getByRole('button', { name: 'Тапнуть гуся' }));
    await waitFor(() => expect(roundsApi.tap).toHaveBeenCalled());
    expect(screen.queryByText('+1')).toBeNull();
    expect(screen.getByText(/Тапов: 0/)).toBeInTheDocument();
  });

  it('на странице раунда есть выключатель звука', async () => {
    renderBoard('survivor');
    const toggle = screen.getByRole('button', { name: 'Звук гуся' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
  });
});
