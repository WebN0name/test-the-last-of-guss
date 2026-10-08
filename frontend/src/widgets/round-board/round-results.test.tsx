import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Participant } from '@/entities/round/types';
import { RoundResults } from './round-results';

describe('RoundResults', () => {
  it('рендерит всего, победителя и мои очки', () => {
    render(
      <RoundResults
        participants={[]}
        total={999999}
        winner={{ userId: 'w', login: 'Иван', score: 100500 }}
        myScore={{ taps: 300, score: 321 }}
      />,
    );
    expect(screen.getByText('999 999')).toBeInTheDocument();
    expect(screen.getByText('Победитель — Иван')).toBeInTheDocument();
    expect(screen.getByText('100 500')).toBeInTheDocument();
    expect(screen.getByText('321')).toBeInTheDocument();
  });

  it('без победителя — «Победителя нет»', () => {
    render(<RoundResults participants={[]} total={0} winner={null} myScore={{ taps: 0, score: 0 }} />);
    expect(screen.getByText('Победителя нет')).toBeInTheDocument();
  });

  describe('таблица участников', () => {
    const people: Participant[] = [
      { place: 1, userId: 'w', login: 'Иван', score: 100500, isMe: false },
      { place: 2, userId: 'u', login: 'Пётр', score: 321, isMe: true },
      { place: 3, userId: 'x', login: 'Мария', score: 0, isMe: false },
    ];
    const winner = { userId: 'w', login: 'Иван', score: 100500 };

    it('рендерит строки по порядку с местом, именем и очками', () => {
      render(<RoundResults total={100821} winner={winner} participants={people} myScore={{ taps: 3, score: 321 }} />);
      const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent('1');
      expect(rows[0]).toHaveTextContent('Иван');
      expect(rows[0]).toHaveTextContent('100 500');
      expect(rows[1]).toHaveTextContent('Пётр');
      expect(rows[2]).toHaveTextContent('Мария');
    });

    it('моя строка подсвечена и помечена для скринридера', () => {
      render(<RoundResults total={1} winner={winner} participants={people} myScore={{ taps: 3, score: 321 }} />);
      const mine = screen.getByText('Пётр').closest('tr');
      const other = screen.getByText('Иван').closest('tr');
      expect(mine?.querySelector('td')).toHaveClass('bg-primary/10');
      expect(other?.querySelector('td')).not.toHaveClass('bg-primary/10');
      expect(within(mine as HTMLElement).getByText('(это вы)')).toBeInTheDocument();
      expect(screen.getAllByText('(это вы)')).toHaveLength(1);
    });

    it('иконка победителя только у победителя', () => {
      const { container } = render(
        <RoundResults total={1} winner={winner} participants={people} myScore={{ taps: 3, score: 321 }} />,
      );
      const table = container.querySelector('table') as HTMLElement;
      expect(table.querySelectorAll('svg')).toHaveLength(1);
      expect(screen.getByText('Иван', { selector: 'td span' }).closest('tr')?.querySelector('svg')).not.toBeNull();
    });

    it('разрыв в местах — разделитель перед моей строкой', () => {
      const withGap: Participant[] = [
        { place: 1, userId: 'w', login: 'Иван', score: 9, isMe: false },
        { place: 51, userId: 'u', login: 'Пётр', score: 1, isMe: true },
      ];
      render(<RoundResults total={10} winner={winner} participants={withGap} myScore={{ taps: 1, score: 1 }} />);
      const gap = screen.getByTestId('places-gap');
      expect(gap).toHaveTextContent('…');
      expect(gap.nextElementSibling).toHaveTextContent('Пётр');
    });

    it('без разрыва разделителя нет', () => {
      render(<RoundResults total={1} winner={winner} participants={people} myScore={{ taps: 3, score: 321 }} />);
      expect(screen.queryByTestId('places-gap')).toBeNull();
    });

    it('без участников таблицы нет', () => {
      render(<RoundResults total={0} winner={null} participants={[]} myScore={{ taps: 0, score: 0 }} />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
