## 1. Backend: Toten Code entfernen

- [x] 1.1 Lösche `backend/supply/services/ingredient_ai_service.py`
- [x] 1.2 Entferne/aktualisiere `HealthRule`-Referenz in `backend/core/management/commands/seed_all.py`
- [x] 1.3 Verifiziere: `uv run python manage.py check` läuft fehlerfrei

## 2. Frontend: Re-Export-Dateien entfernen

- [x] 2.1 Lösche `frontend-food/src/schemas/ingredient.ts` — aktualisiere alle Consumer auf `@/schemas/supply`
- [x] 2.2 Lösche `frontend-food/src/api/ingredients.ts` — aktualisiere alle Consumer auf `@/api/supplies`
- [x] 2.3 Lösche `frontend-food/src/schemas/mealEvent.ts` — aktualisiere Consumer auf `@/schemas/mealPlan`
- [x] 2.4 Lösche `frontend-food/src/pages/planning/MealPlanDetailPage.tsx` und `MealPlanListPage.tsx` — aktualisiere `App.tsx` auf direkte Imports

## 3. Frontend: Ungenutzte Komponenten und Utils entfernen

- [x] 3.1 Lösche `frontend-food/src/components/ErrorBoundary.tsx`
- [x] 3.2 Lösche `frontend-food/src/components/ScrollToTop.tsx`
- [x] 3.3 Entferne `calculatePer100g` aus `frontend-food/src/utils/nutritionCalculator.ts`
- [x] 3.4 Entferne `COSTS_OPTIONS` aus `frontend-food/src/schemas/content.ts`

## 4. Frontend: Ungenutzte API-Hooks entfernen

- [x] 4.1 Entferne Material-Hooks aus `frontend-food/src/api/supplies.ts` (`useMaterials`, `useMaterial`, `useMaterialBySlug`, `useSupplySearch`, `useCreateMaterial`, `useUpdateMaterial`)
- [x] 4.2 Entferne `useMeasuringUnits` aus `frontend-food/src/api/supplies.ts`
- [x] 4.3 Entferne `usePortions` aus `frontend-food/src/api/supplies.ts`
- [x] 4.4 Entferne Recipe-Folder-Hooks und `RecipeFolderSchema` aus `frontend-food/src/api/recipes.ts` und `frontend-food/src/schemas/recipe.ts`
- [x] 4.5 Entferne `useDgeReferences` aus `frontend-food/src/api/normPerson.ts`

## 5. Frontend: Fetch-Helper konsolidieren

- [x] 5.1 Stelle `frontend-food/src/api/tags.ts` auf `@/lib/api` um (entferne lokale `fetchJson` und hart-codierten `API_BASE`)
- [ ] 5.2 Entferne duplizierte `fetchJson`/`postJsonRaw`/`patchJsonRaw`/`deleteJsonRaw` aus `frontend-food/src/api/supplies.ts` und nutze `@/lib/api` — SKIPPED: `lib/api.ts` bietet nur `fetchWithCsrf` ohne Zod-Parsing, Refactor wäre zu invasiv

## 6. Frontend: Verzeichnis-Bereinigung

- [x] 6.1 Verschiebe `frontend-food/src/pages/supplies/IngredientDetailPage.tsx` nach `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` (ersetze den Re-Export)
- [x] 6.2 Lösche das Verzeichnis `frontend-food/src/pages/supplies/`
- [x] 6.3 Reduziere `frontend-food/src/lib/entityUrls.ts` auf Food-relevante Entity-Typen (Recipe, Ingredient, User, Tag)

## 7. Verifizierung

- [x] 7.1 TypeScript-Build: `npm run build` in `frontend-food/` fehlerfrei
- [x] 7.2 Backend-Check: `uv run python manage.py check` fehlerfrei
