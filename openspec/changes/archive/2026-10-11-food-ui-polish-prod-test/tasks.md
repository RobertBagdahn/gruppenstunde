## 1. Wizard und Formulare

- [x] 1.1 Schritt-Zähler in `RecipeWizard.tsx`/`wizardSteps.ts`: Pfad-Annahme vor der Eingabe, stabile Gesamtzahl, Test für beide Pfade
- [x] 1.2 Zutat anlegen: Backend `409` (`ingredient_exists`) mit `existing` bei Duplikat (`backend/supply/api/ingredients.py`, `ApiError` um `extra` erweitert), `ApiError` im Frontend liest `existing`/`fields`; dazu Slug-Vergabe berücksichtigt gelöschte Zutaten
- [x] 1.3 `CreateIngredientPage.tsx`: Backend-Meldung und Duplikat-Link statt generischem Toast
- [x] 1.4 Inline-Pflichtfeldfehler mit Fokus: Zutatenname, Rezepttitel im Bearbeiten, Test

## 2. Planer

- [x] 2.1 Reine Helfer `removeItemFromPlan` und `scaleItemInPlan` in `api/mealPlanOptimistic.ts` mit Tests
- [x] 2.2 `useRemoveMealItem` und `useUpdateMealItem` nutzen sie in `onMutate` (Rollback bei Fehler, `onSettled` lädt neu)

## 3. Auth-Seiten

- [x] 3.1 `LoginPage`/`RegisterPage`: Weiterleitung eingeloggter Nutzer war im Code bereits vorhanden; Verhalten mit `LoginPage.test.tsx` abgesichert
- [x] 3.2 `ToolLandingPage.tsx`: Anmelde-Button nur für nicht eingeloggte Nutzer

## 4. Abschluss

- [x] 4.1 Frontend-Typecheck, Lint, Tests; `uv run pytest backend/supply`
- [x] 4.2 Manuell prüfen: stabiler Wizard-Zähler und optimistische Plan-Summen inkl. Rollback. (2026-10-11: food-recipe-wizard report confirms the wizard counter; food-mealplans report confirms immediate header updates and rollback after HTTP 500.)
- [ ] 4.3 Manuell nachprüfen: Duplikat-Link nach dem Fehlerhandling-Fix, leerer Rezepttitel mit Inline-Fehler/Fokus sowie eingeloggte Food-Landingpage. The available food-ingredients-dataquality report reproduces the missing duplicate link before the fix, and the available auth-permissions report verifies the main-frontend landing page rather than the Food landing page; no post-fix evidence for these acceptance points was found.
