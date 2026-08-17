## Context

`api/refMeals.ts` definiert `API_BASE = '/api/meal-plans'`. Der `useMealPlan`-Hook in `api/mealPlans.ts` registriert seinen Cache unter `queryKey: ['meal-plan', id]`. Alle 11 `invalidateQueries`-Aufrufe in `refMeals.ts` verwenden stattdessen `'mealPlan'` (camelCase) — ein anderer String, der nie mit dem Cache-Key matched.

## Goals / Non-Goals

**Goals:**
- Nach jeder RefMeal-Mutation wird der korrekte `useMealPlan`-Cache invalidiert
- Die MealPlan-Detailansicht zeigt nach RefMeal-Operationen sofort aktualisierte Daten

**Non-Goals:**
- Refactoring der Query-Key-Struktur insgesamt
- Änderungen an anderen Mutations

## Decisions

**D1 — Minimaler Fix: nur die falschen Strings korrigieren**
Alle `'mealPlan'` → `'meal-plan'` in `refMeals.ts`. Kein weiteres Refactoring.

**D2 — Kein zentrales Query-Key-Objekt einführen**
Ein zentrales `QUERY_KEYS`-Objekt wäre sauberer, aber das geht über den Scope dieses Fixes hinaus.

## Risks / Trade-offs

- Kein nennenswertes Risiko — rein additive Korrektur, keine Logik-Änderung.
