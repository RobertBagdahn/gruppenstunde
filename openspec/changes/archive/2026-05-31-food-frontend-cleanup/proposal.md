## Why

Das Food-Frontend (`frontend-food/`) enthält signifikanten toten Code: ungenutzte Komponenten, verwaiste API-Hooks, überflüssige Backward-Compat Re-Export-Dateien, duplizierte Fetch-Helper und einen komplett ungenutzten Backend-Service. Dies erhöht die kognitive Last, erschwert Refactoring und verursacht Inkonsistenzen (z.B. fehlende CSRF-Token in `api/tags.ts`).

## What Changes

- **Entfernung toter Dateien**: `ingredient_ai_service.py` (Backend), `ErrorBoundary.tsx`, `ScrollToTop.tsx` (Frontend)
- **Entfernung unnötiger Re-Export-Dateien**: `schemas/ingredient.ts`, `api/ingredients.ts`, `schemas/mealEvent.ts`, `pages/planning/MealPlan*.tsx` — Consumer direkt auf Quell-Module umstellen
- **Entfernung ungenutzter API-Hooks**: Material-Hooks, `useMeasuringUnits`, `usePortions`, Recipe-Folder-Hooks, `useDgeReferences`
- **Entfernung ungenutzter Schemas**: `RecipeFolderSchema`, `COSTS_OPTIONS`, `calculatePer100g`
- **Konsolidierung Fetch-Helper**: `api/tags.ts` auf `@/lib/api` umstellen, eigene `fetchJson`-Implementierung entfernen
- **Verzeichnis-Bereinigung**: `pages/supplies/IngredientDetailPage.tsx` nach `pages/ingredients/` verschieben
- **Reduktion von `lib/entityUrls.ts`**: Auf Food-relevante Entity-Typen beschränken
- **Fix**: Stale `HealthRule`-Referenz in `seed_all.py` entfernen

## Capabilities

### New Capabilities

_Keine neuen Capabilities — dies ist ein reines Cleanup._

### Modified Capabilities

_Keine Requirement-Änderungen — nur Entfernung von totem Code und Konsolidierung._

## Impact

- **Frontend-Food**: ~15 Dateien betroffen (Löschungen + Import-Anpassungen)
- **Backend**: `supply/services/ingredient_ai_service.py` (Löschung), `core/management/commands/seed_all.py` (Fix)
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod Schemas ändern sich inhaltlich
- **Keine Migrations nötig**: Kein Datenmodell betroffen
- **Keine API-Änderungen**: Nur interne Code-Bereinigung
