import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSpaceTap } from './use-space-tap';

function press(target: EventTarget, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function release(target: EventTarget) {
  target.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
}

describe('useSpaceTap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('пробел вне полей и кнопок — тап, прокрутка страницы отменена, гусь прожат до отпускания', () => {
    const onTap = vi.fn();
    const onPressChange = vi.fn();
    renderHook(() => useSpaceTap(true, onTap, onPressChange));
    const event = press(document.body);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(onPressChange).toHaveBeenLastCalledWith(true);
    release(document.body);
    expect(onPressChange).toHaveBeenLastCalledWith(false);
  });

  it('удержание пробела (автоповтор) не тапает повторно', () => {
    const onTap = vi.fn();
    renderHook(() => useSpaceTap(true, onTap, vi.fn()));
    press(document.body);
    press(document.body, { repeat: true });
    press(document.body, { repeat: true });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('пробел на кнопке, ссылке или поле обрабатывает сам элемент, тапа нет', () => {
    const onTap = vi.fn();
    renderHook(() => useSpaceTap(true, onTap, vi.fn()));
    document.body.innerHTML = '<button>звук</button><a href="/rounds">Раунды</a><input />';
    for (const selector of ['button', 'a', 'input']) {
      const event = press(document.querySelector(selector)!);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(onTap).not.toHaveBeenCalled();
  });

  it('другие клавиши и сочетания с модификаторами игнорируются', () => {
    const onTap = vi.fn();
    renderHook(() => useSpaceTap(true, onTap, vi.fn()));
    press(document.body, { code: 'KeyA', key: 'a' });
    press(document.body, { ctrlKey: true });
    expect(onTap).not.toHaveBeenCalled();
  });

  it('выключен вне активной фазы и снимает обработчик при размонтировании', () => {
    const onTap = vi.fn();
    const { rerender, unmount } = renderHook(({ enabled }) => useSpaceTap(enabled, onTap, vi.fn()), {
      initialProps: { enabled: false },
    });
    press(document.body);
    expect(onTap).not.toHaveBeenCalled();
    rerender({ enabled: true });
    press(document.body);
    expect(onTap).toHaveBeenCalledTimes(1);
    unmount();
    press(document.body);
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
