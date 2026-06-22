## Why

Alle RefMeal-Mutationen (Create, Update, Delete, Sync, Link, Unlink, LinkAll) invalidieren in `api/refMeals.ts` den falschen TanStack-Query-Key `'mealPlan'` statt des korrekten `'meal-plan'`. Der `useMealPlan`-Hook registriert seinen Cache unter `['meal-plan', id]`. Die Folge: nach jeder RefMeal-Aktion bleibt die MealPlan-Detailansicht dauerhaft veraltet, bis der Nutzer manuell neu lädt.

## What Changes

- Alle `queryClient.invalidateQueries({ queryKey: ['mealPlan', ...] })` in `api/refMeals.ts` werden korrigiert zu `['meal-plan', ...]`
- Damit werden nach RefMeal-Operationen die richtigen Caches invalidiert und die UI aktualisiert sich automatisch

## Capabilities

### New Capabilities
_(keine neuen Capabilities — rein technischer Bug-Fix)_

### Modified Capabilities
_(keine Spec-Level-Änderungen)_

## Impact

- **Frontend**: `frontend-food/src/api/refMeals.ts` (11 Stellen)
- **Keine Backend-Änderungen**, keine Migrationen
