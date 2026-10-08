import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetServerClock } from '@/shared/server-clock/server-clock';
import { RoundCard } from './round-card';
import type { Round } from './types';

const round: Round = {
  id: '3f2b8c1e-5d4a-4e6b-9a7c-1b2d3e4f5a6b',
  creator: { id: 'a', login: 'admin' },
  startAt: '2020-10-07T10:00:30.000Z',
  endAt: '2020-10-07T10:01:30.000Z',
  status: 'finished',
  createdAt: '2020-10-07T10:00:00.000Z',
};

function renderCard(r: Round) {
  return render(
    <MemoryRouter>
      <RoundCard round={r} />
    </MemoryRouter>,
  );
}

describe('RoundCard', () => {
  afterEach(() => {
    vi.useRealTimers();
    resetServerClock();
  });

  it('у завершённой карточки нет таймеров', () => {
    vi.useFakeTimers();
    renderCard(round);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('карточка в cooldown становится активной ровно в startAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-10-07T10:00:28.300Z'));
    renderCard(round);
    expect(screen.getByRole('link').getAttribute('aria-label')).toContain('Cooldown');
    act(() => vi.advanceTimersByTime(1700));
    expect(screen.getByRole('link').getAttribute('aria-label')).toContain('Активен');
  });

  it('ссылка ведёт на раунд, UUID не показан, имя содержит создателя', () => {
    const { container } = render(
      <MemoryRouter>
        <RoundCard round={round} />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(`/rounds/${round.id}`);
    expect(container.textContent).not.toContain(round.id);
    expect(link.getAttribute('aria-label')).toContain('admin');
    expect(link.getAttribute('aria-label')).toContain('Завершён');
  });
});
