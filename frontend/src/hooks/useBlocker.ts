import { useContext, useEffect, useCallback, useState, useRef } from 'react';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';

/**
 * Custom useBlocker that works with BrowserRouter (non-data router).
 * Intercepts navigator.push/replace to block in-app navigation.
 */
export function useBlocker(when: boolean) {
  const { navigator } = useContext(NavigationContext);
  const [blocked, setBlocked] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const originalRef = useRef<{ push: typeof navigator.push; replace: typeof navigator.replace } | null>(null);

  useEffect(() => {
    if (!when) {
      return;
    }

    const origPush = navigator.push;
    const origReplace = navigator.replace;
    originalRef.current = { push: origPush, replace: origReplace };

    navigator.push = (...args: Parameters<typeof origPush>) => {
      setBlocked(true);
      pendingRef.current = () => origPush.apply(navigator, args);
    };

    navigator.replace = (...args: Parameters<typeof origReplace>) => {
      setBlocked(true);
      pendingRef.current = () => origReplace.apply(navigator, args);
    };

    return () => {
      navigator.push = origPush;
      navigator.replace = origReplace;
      originalRef.current = null;
    };
  }, [when, navigator]);

  const proceed = useCallback(() => {
    // Restore original methods before proceeding
    if (originalRef.current) {
      navigator.push = originalRef.current.push;
      navigator.replace = originalRef.current.replace;
    }
    pendingRef.current?.();
    pendingRef.current = null;
    setBlocked(false);
  }, [navigator]);

  const reset = useCallback(() => {
    pendingRef.current = null;
    setBlocked(false);
  }, []);

  return {
    state: blocked ? ('blocked' as const) : ('idle' as const),
    proceed,
    reset,
  };
}
