import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Countdown } from './countdown';

describe('Countdown', () => {
  it('показывает mm:ss и подпись', () => {
    render(<Countdown ms={23_000} label="До конца осталось" alert={false} />);
    expect(screen.getByText('00:23')).toBeInTheDocument();
    expect(screen.getByText('До конца осталось')).toBeInTheDocument();
  });

  it('в режиме alert цифры красные', () => {
    render(<Countdown ms={5_000} label="До конца осталось" alert />);
    expect(screen.getByText('00:05').className).toMatch(/text-destructive/);
  });
});
