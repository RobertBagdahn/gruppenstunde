## Why

Admins, Staff und Recipe-Owner müssen aktuell auf eine separate Edit-Seite navigieren, um Basisdaten eines Rezepts (Portionen, Zutaten-Mengen) anzupassen. Besonders bei importierten Rezepten mit fehlenden Gramm-Angaben (0g) ist das umständlich. Ein Inline-Edit-Mode auf der Detailseite mit AI-Mengen-Schätzung beschleunigt die Datenpflege erheblich.

## What Changes

- **Inline Edit-Mode** auf der Rezept-Detailseite (Toggle-Button, nur bei `can_edit`)
- Editierbare Felder im Edit-Mode: Basis-Portionen (`servings`) und Zutaten (Menge, Einheit, Notiz, Löschen, Sortierung)
- **Zutat hinzufügen**: Autocomplete-Suche über bestehende Ingredients + Möglichkeit neue Ingredients direkt zu erstellen
- **AI-Zauberstab** (🪄): Gemini schätzt realistische Gramm-Mengen für alle Zutaten basierend auf Rezeptkontext. Zeigt Vorschlag pro Person UND total an, User reviewt vor Übernahme.
- Speichern per PATCH pro geändertem RecipeItem

## Capabilities

### New Capabilities
- `recipe-inline-edit`: Inline-Bearbeitungsmodus für Rezept-Zutaten und Portionen auf der Detailseite, inkl. AI-Mengenschätzung

### Modified Capabilities
- `recipe`: Neuer API-Endpoint für AI-Mengenschätzung bestehender RecipeItems

## Impact

- **Backend**: `recipe/api/` — neuer Endpoint `POST /api/recipes/{id}/estimate-quantities/` (nutzt bestehenden `RecipeAiIngredientsService` adaptiert für existierende Items). Keine neuen Models, keine Migrations.
- **Frontend**: `RecipeDetailPage.tsx` — neuer Edit-Mode State, neue Komponenten (`InlineIngredientEditor`, `IngredientSearchAdd`, `AiEstimatePreview`). Neuer TanStack Query Mutation Hook.
- **Schemas**: Neues Pydantic-Schema `EstimateQuantitiesOut` (Backend) + Zod-Äquivalent (Frontend)
- **Betroffene Apps**: `recipe` (Backend), Frontend Recipe-Seite
