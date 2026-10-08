import { render } from '@testing-library/react';
import { domMax, LazyMotion } from 'motion/react';
import { describe, expect, it } from 'vitest';
import type { RoundPhase } from '@/entities/round/types';
import { GooseButton } from './goose-button';

function renderGoose(phase: RoundPhase, pressed: boolean) {
  const { container } = render(
    <LazyMotion features={domMax} strict>
      <GooseButton phase={phase} pressed={pressed} onPressChange={() => undefined} onTap={() => undefined} />
    </LazyMotion>,
  );
  const frames = Array.from(container.querySelectorAll<HTMLImageElement>('img[data-frame]'));
  const visible = frames.filter((img) => img.dataset.visible === 'true').map((img) => img.dataset.frame);
  return { frames, visible };
}

describe('GooseButton', () => {
  it('все три кадра в DOM сразу, чтобы картинки загрузились до первого тапа', () => {
    const { frames } = renderGoose('cooldown', false);
    expect(frames.map((img) => img.dataset.frame).sort()).toEqual(['ready', 'stop', 'tapped']);
  });

  it.each([
    ['cooldown', false, 'stop'],
    ['active', false, 'ready'],
    ['active', true, 'tapped'],
    ['finished', true, 'stop'],
  ] as const)('фаза %s, нажат %s — виден только кадр %s', (phase, pressed, expected) => {
    const { visible } = renderGoose(phase, pressed);
    expect(visible).toEqual([expected]);
  });
});
