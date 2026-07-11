## Why

Der aktuelle Rezept-Erstellungsfluss zwingt Nutzer, Zutaten erst NACH der Erstellung auf der Detail-Seite hinzuzufügen (`?edit=ingredients`). Der Wizard (`ContentStepper`) bietet keinen Zutaten-Editor und keinen Step-Editor — diese Komponenten existieren ausschließlich auf der Detail-Seite. Das führt zu einem fragmentierten Workflow: Erstellen → Weiterleitung → Zutaten nachtragen → Steps nachtragen. Ein neuer, Rezept-spezifischer Wizard mit integriertem Zutaten- und Step-Editor macht die Erstellung in einem Durchlauf abschließbar.

## What Changes

- **Neuer `RecipeWizard`**: 5-Step Wizard spezifisch für Rezepte (Method → Zutaten → Metadaten → Steps → Vorschau). Ersetzt `ContentStepper` in der `CreateRecipePage`.
- **Zutaten-Editor im Wizard**: `InlineIngredientEditor` + `IngredientAutocomplete` aus der Detail-Seite werden als Step 1 in den Wizard integriert. Nutzer fügen Zutaten direkt zu Beginn hinzu.
- **Step-Editor im Wizard**: `StepEditor` aus der Detail-Seite wird als Step 3 in den Wizard integriert. Strukturierte Schritte können während der Erstellung definiert werden.
- **Frühe Draft-Erstellung**: Rezept wird als Draft gespeichert, sobald Titel + Rezept-Typ + mindestens eine Zutat existieren (Step 1). Alle weiteren Steps speichern inkrementell (`PATCH` recipe, `PUT` steps/batch).
- **Methoden-Wahl als Step 0**: Manuell, KI-Text oder URL-Import. Bei KI wird sofort `POST /api/recipes/ai-create/` aufgerufen und ein Draft erstellt. Bei URL wird eine Vorschau gezeigt und nach Bestätigung der Draft erstellt.
- **Auto-Save zwischen Steps**: Jeder "Weiter"-Klick persistiert die Änderungen des aktuellen Steps via API.
- **Drafts unsichtbar in Suche**: Bereits vom Backend korrekt gefiltert (`status="approved"` für öffentliche Listings). Keine API-Änderung nötig.
- **Detail-Seite unverändert**: `?edit=ingredients`, `?mode=steps`, `InlineEditor` und `EditRecipePage` bleiben erhalten für nachträgliche Bearbeitung.

## Capabilities

### New Capabilities
- `recipe-creation-wizard`: Der 5-Step Wizard (Method → Zutaten → Metadaten → Steps → Vorschau) mit integrierten Edit-Komponenten und inkrementellem Speichern.
- `recipe-draft-workflow`: Frühe Draft-Erstellung in Step 1, Status-Lifecycle (draft → submitted → approved), Unsichtbarkeit in öffentlichen Listings, Auto-Save zwischen Wizard-Steps.

### Modified Capabilities
- `recipe-url-import`: URL-Import wird von einem separaten Entry-Point in der CreateRecipePage zu einem Tool innerhalb des Wizard Step 0 (Methoden-Wahl). Der API-Endpoint `POST /api/recipes/import-from-url/` bleibt unverändert.

## Impact

- **Frontend (frontend-food/)**:
  - Neu: `src/components/recipe/RecipeWizard.tsx` — 5-Step Wizard Container
  - Neu: `src/components/recipe/WizardStepMethod.tsx` — Methoden-Wahl (Manuell/KI/URL)
  - Neu: `src/components/recipe/WizardStepIngredients.tsx` — Zutaten-Step (Wrapper um InlineIngredientEditor)
  - Neu: `src/components/recipe/WizardStepMetadata.tsx` — Metadaten-Step
  - Neu: `src/components/recipe/WizardStepSteps.tsx` — Steps-Step (Wrapper um StepEditor)
  - Neu: `src/components/recipe/WizardStepPreview.tsx` — Vorschau & Speichern
  - Geändert: `src/pages/recipes/CreateRecipePage.tsx` — Nutzt RecipeWizard statt ContentStepper
  - Extrahiert: `InlineIngredientEditor` muss als standalone Komponente nutzbar sein (aktuell tief in RecipeDetailPage eingebettet)
  - Extrahiert: `StepEditor` muss als standalone Komponente nutzbar sein (aktuell in RecipeDetailPage eingebettet)
- **Backend (backend/)**:
  - `PATCH /api/recipes/{id}/`: Prüfen, ob Metadaten-Update ohne `recipe_items` die existierenden Zutaten löscht. Falls ja: Endpoint so anpassen, dass `recipe_items` nur bei expliziter Angabe ersetzt wird.
  - Keine neuen API-Endpoints nötig.
- **Betroffene Specs**: `recipe-url-import` (Verhaltensänderung), `content-base` (ContentStepper nicht mehr für Rezepte — keine Spec-Änderung, nur Implementierung)
- **Keine DB-Migrationen** nötig.
