## Why

Die Rezepterstellung (`frontend-food/src/components/recipe/RecipeWizard.tsx`, 566 Zeilen) ist schwer zu ändern und für Nutzer fehleranfällig:

- **Schritte werden über Indizes adressiert, die sich verschieben** (`hasReviewStep ? 3 : 2`, `hasReviewStep ? 5 : 4`). Zusätzlich gibt es einen toten Zweig `currentStep === 3`, der je nach Pfad mit dem Zutaten- oder Materialschritt kollidiert.
- **Fünf imperative Ref-Handles** (`methodStepRef`, `basisStepRef`, `ingredientsStepRef`, `stepsStepRef`, `previewStepRef`) plus Zustand-Store plus lokaler State. Jeder Schritt speichert anders.
- **Ohne KI kein Rezept**:
  - `WizardStepMethod` lehnt leere Eingaben ab.
  - `WizardStepBasis.save()` verlangt ein KI-Ergebnis.
  - Liefert die KI keine Zutaten, wird `hasReviewStep` false, und in diesem Zweig wird **nie ein Rezept angelegt**.
- **Neuladen verliert alles**: Das Rezept existiert ab dem Review-Schritt serverseitig, aber weder seine ID noch der aktuelle Schritt stehen in der URL (Audit-Befund 18, 3× reproduziert).
- **Pro-Portion-Normierung im Frontend** (`quantity / servings` in `RecipeWizard.tsx`). `input_servings` ist nur ein flüchtiges Attribut am Modell (`recipe/models/recipe.py:223`) und nach dem Neuladen weg.
- Die Spec `unified-recipe-creation` beschreibt 5 Schritte; implementiert sind 6 bzw. 7.

## What Changes

- **Schritt-Modell mit IDs**:
  - Deklaratives Array `WIZARD_STEPS` mit `id`, `label`, `help`, `isVisible(ctx)` und `onLeave(ctx)`.
  - Schritte registrieren ihren Speichern-Handler über einen `WizardStepContext`. Die fünf Ref-Handles und alle Index-Berechnungen entfallen.
  - Schritt-IDs: `input`, `basis`, `review`, `ingredients`, `materials`, `preparation`, `preview`.
- **Entwurf in der URL**: `/recipes/new?draft=<recipeId>&step=<stepId>`.
  - Sobald das Rezept angelegt ist, stehen seine ID und der Schritt in der URL.
  - Neuladen, Zurück-Button und Wiederaufnahme laden den Entwurf vom Server.
  - Schritte vor dem Anlegen bleiben reiner Client-Zustand, mit der bestehenden Warnung beim Verlassen.
- **Genau ein Anlegepunkt**: Das Rezept wird beim Verlassen des letzten Schritts vor „Zutaten“ angelegt (`review`, wenn sichtbar, sonst `basis`). Damit ist der Pfad „KI ohne Zutaten“ behoben.
- **Manuell ohne KI starten**: Im Schritt `input` gibt es den Link „Ohne KI manuell beginnen“. Er überspringt die Analyse. `basis` fragt dann Titel, Typ und Personenzahl ohne Vorbelegung ab.
- **Normierung im Backend**:
  - `RecipeCreateIn.input_servings` (1–100) wird Pflicht, wenn `recipe_items` oder `ingredient_review_rows` übergeben werden. Das Backend teilt die Mengen.
  - `Recipe.source_servings` wird als Feld gespeichert (Migration).
  - Das Frontend teilt nicht mehr.
- Spec `unified-recipe-creation` wird an die tatsächlichen Schritte und den manuellen Einstieg angepasst.

## Capabilities

### New Capabilities
- `recipe-wizard-draft-resume`: URL-basierter Entwurfs- und Schrittzustand des Rezept-Wizards, Wiederaufnahme nach Neuladen, ein Anlegepunkt.
- `recipe-servings-normalization`: serverseitige Normierung von Zutatenmengen auf eine Portion anhand der Original-Personenzahl, persistiert als `source_servings`.

### Modified Capabilities
- `unified-recipe-creation`: Einstieg erlaubt zusätzlich „Ohne KI manuell beginnen“; die Schrittfolge wird auf die tatsächlichen Schritte (inkl. bedingtem Review und Materialien) aktualisiert.

## Impact

- **Frontend (`frontend-food/`)**
  - `components/recipe/RecipeWizard.tsx`: Neuaufbau um Schritt-Array, `WizardStepContext`, URL-State
  - `components/recipe/wizardSteps.ts`: neu
  - `WizardStepMethod.tsx`: manueller Einstieg
  - `WizardStepBasis.tsx`: ohne KI-Ergebnis nutzbar
  - `WizardStepIngredients.tsx`, `WizardStepSteps.tsx`, `WizardStepPreview.tsx`: Registrierung statt `forwardRef`/`useImperativeHandle`
  - `pages/recipes/CreateRecipePage.tsx`
  - Zod: `RecipeCreateInSchema` (+ `input_servings`), `RecipeDetailSchema` (`source_servings`)
- **Backend**
  - `recipe/models/recipe.py`: Feld `source_servings` (PositiveSmallInteger, null); **Migration**
  - `recipe/schemas/recipes.py`: `RecipeCreateIn.input_servings`, `RecipeDetailOut.source_servings`, flüchtiges `input_servings` entfernen
  - `recipe/api/recipes.py` (`POST /api/recipes/`): Normierung
- **Abhängigkeit**: setzt `ingredient-status-visibility-unification` voraus (gleiche Funktion `create_recipe`).
- **Keine** Änderung an Rezeptdetail und `/edit` (Zusammenführung der Editoren ist nicht Teil dieses Changes).
