## Why

In Schritt 1 der Rezepterstellung (`/recipes/new`) existieren derzeit zwei primäre Aktionsschaltflächen: Ein grüner Button „Mit KI analysieren“ innerhalb der Eingabekarte und der globale „Weiter“-Button in der Fußleiste. Klickt der Nutzer auf „Mit KI analysieren“, wird zwar die Analyse durchgeführt, die UI verbleibt jedoch stumm auf Seite 1, ohne weiterzuschalten. Erst ein anschließender Klick auf „Weiter“ bringt den Nutzer zu Schritt 2. Dieser doppelte Klick ist irreführend und inkonsistent.

## What Changes

- Der redundante Button `Mit KI analysieren` (`data-testid="recipe-smart-analyze"`) in `WizardStepMethod.tsx` wird ersatzlos entfernt.
- Die primäre Fußleisten-Aktion in `RecipeWizard.tsx` wird kontextsensitiv:
  - In Schritt 1 (KI-Eingabe) lautet der Button **`Rezept analysieren`** (während der Laufzeit **`Analysiert…`**).
  - In den Schritten 2–3 lautet er unverändert **`Weiter`**.
  - In Schritt 5 lautet er unverändert **`Fertigstellen`**.
- Das Auslösen der Analyse über den Fußleisten-Button führt nach erfolgreicher Antwort der KI-Analyse **automatisch und unmittelbar zu Schritt 2** (Basis & Portionen).
- E2E-Tests (`recipe-ingredient-editing.spec.ts`, `recipe-workflows.spec.ts`, `food-contracts.mocked.spec.ts`, `recipe-integrity.live.spec.ts`), die bisher den doppelten Klick (`recipe-smart-analyze` gefolgt von `Weiter`) ausgeführt haben, werden auf den einheitlichen Flow umgestellt.

## Capabilities

### New Capabilities
<!-- Keine neuen Capabilities -->

### Modified Capabilities
- `unified-recipe-creation`: Der Einstiegsschritt (Schritt 1) besitzt nur noch die zentrale Navigationsaktion („Rezept analysieren“), die bei erfolgreicher Analyse automatisch auf Schritt 2 („Basis & Portionen“) weiterschaltet.

## Impact

- Frontend: `frontend-food/src/components/recipe/WizardStepMethod.tsx` und `frontend-food/src/components/recipe/RecipeWizard.tsx`
- Tests: `e2e/tests/recipe-ingredient-editing.spec.ts`, `e2e/tests/recipe-workflows.spec.ts`, `e2e/tests/food-contracts.mocked.spec.ts`, `e2e/tests/recipe-integrity.live.spec.ts`
- Keine Backend- oder Datenbankänderungen.
