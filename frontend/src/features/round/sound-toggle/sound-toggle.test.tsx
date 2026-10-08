import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { setSoundMuted } from '@/shared/lib/sound/sound-muted-store';
import { SoundToggle } from './sound-toggle';

describe('SoundToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setSoundMuted(false);
  });

  it('по умолчанию звук включён: aria-pressed=true и иконка Volume2', () => {
    render(<SoundToggle />);
    const button = screen.getByRole('button', { name: 'Звук гуся' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.querySelector('.lucide-volume-2')).not.toBeNull();
  });

  it('клик выключает звук: aria-pressed=false, иконка VolumeX, значение сохраняется', async () => {
    render(<SoundToggle />);
    const button = screen.getByRole('button', { name: 'Звук гуся' });
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.querySelector('.lucide-volume-x')).not.toBeNull();
    expect(window.localStorage.getItem('guss:sound-muted')).toBe('1');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});
