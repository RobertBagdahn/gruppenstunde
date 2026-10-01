import { useEffect } from 'react';

interface ShortcutMeal {
  id: number;
  start_datetime: string | null;
}

interface UseOmnibarShortcutOptions {
  /** Only editors on the planning view may open the search. */
  enabled: boolean;
  meals: ShortcutMeal[];
  /** Meal the user interacted with last; the shortcut targets it. */
  lastActiveMealId: number | null;
  /** Meal of the currently open page-level dialog, if any. */
  openMealId: number | null;
  onOpenMeal: (mealId: number | null) => void;
}

/**
 * Cmd/Ctrl+K opens exactly one search dialog for the last active meal (or the
 * first meal of the plan) and closes it again on the second press. A dialog
 * that is already open — e.g. one a slot opened by click — is never stacked.
 */
export function useOmnibarShortcut({
  enabled,
  meals,
  lastActiveMealId,
  openMealId,
  onOpenMeal,
}: UseOmnibarShortcutOptions): void {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (openMealId !== null) {
        onOpenMeal(null);
        return;
      }
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      const target = meals.find((meal) => meal.id === lastActiveMealId)
        ?? [...meals].sort((a, b) => (a.start_datetime ?? '').localeCompare(b.start_datetime ?? ''))[0];
      if (target) onOpenMeal(target.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, meals, lastActiveMealId, openMealId, onOpenMeal]);
}
