import { useEffect, useRef } from 'react';

const SELF_HANDLED =
  'button, a[href], input, textarea, select, summary, [contenteditable="true"], [role="button"], [role="tab"], [role="link"]';

function isSpace(event: KeyboardEvent): boolean {
  return event.code === 'Space' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function handledByTarget(event: KeyboardEvent): boolean {
  return event.target instanceof Element && event.target.closest(SELF_HANDLED) !== null;
}

export function useSpaceTap(enabled: boolean, onTap: () => void, onPressChange: (pressed: boolean) => void): void {
  const pressedBySpace = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const release = () => {
      if (!pressedBySpace.current) return;
      pressedBySpace.current = false;
      onPressChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSpace(event) || handledByTarget(event)) return;
      event.preventDefault();
      if (event.repeat) return;
      pressedBySpace.current = true;
      onPressChange(true);
      onTap();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') release();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', release);
    };
  }, [enabled, onTap, onPressChange]);
}
