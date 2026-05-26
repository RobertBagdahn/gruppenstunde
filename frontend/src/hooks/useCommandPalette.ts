/**
 * useCommandPalette — global Cmd+K/Ctrl+K keyboard listener.
 * Does not trigger when a text input, textarea, or contenteditable is focused.
 */
import { useEffect, useState, useCallback } from 'react';

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only trigger on Cmd+K (mac) or Ctrl+K (win/linux)
      if (!((e.metaKey || e.ctrlKey) && e.key === 'k')) return;

      // Skip if user is in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();
      toggle();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { open, setOpen, toggle };
}
