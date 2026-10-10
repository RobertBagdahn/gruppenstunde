import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UnitViewMode = 'start' | 'grams';

/** Page-wide unit view ("?units=grams"); row choices override it, nothing is saved. */
export function useUnitViewMode(): [UnitViewMode, (mode: UnitViewMode) => void] {
  const [params, setParams] = useSearchParams();
  const mode: UnitViewMode = params.get('units') === 'grams' ? 'grams' : 'start';
  const setMode = useCallback(
    (next: UnitViewMode) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next === 'grams') updated.set('units', 'grams');
          else updated.delete('units');
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [mode, setMode];
}
