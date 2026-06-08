## Why

Die KI-Vorschläge für Zutaten liefern aktuell keine Portionen, Ernährungstags und Aliase — das Pydantic-Schema markiert diese Felder als optional (`| None`), Gemini liefert sie deshalb fast nie. Gleichzeitig fehlen Pfadfinder-relevante Felder (Lagerung, Saisonalität, Kochfaktor) im Ingredient-Modell. Der Dialog ist mit 512px zu schmal für die Datenfülle und die KI-generierten Alias-Namen sind zu generisch ("Nudeln" statt "Fusilli, Makkaroni, Spaghetti").

## What Changes

- **BREAKING (API-Schema)**: `portions`, `aliases`, `nutritional_tags` in `IngredientSuggestAllSchema` werden von optional auf required geändert. Die Antwort enthält immer diese Listen.
- **Neues KI-Feld**: `name_suggestion` — Gemini schlägt einen spezifischeren Zutaten-Namen vor (z.B. "Kuhmilch 3,5% Fett" statt "Milch"). Keine Marken, keine Mengenangaben.
- **6 neue Ingredient-Felder** (Pfadfinder-relevant):
  - `storage_type` (Enum: trocken/kühlschrank/gefroren/raumtemperatur)
  - `cooking_factor` (Multiplikator Roh→Gekocht, z.B. 2.5 für Nudeln)
  - `camp_suitable` (Boolean: gut fürs Zeltlager geeignet)
  - `preparation_time_min` (Minuten Zubereitungsdauer)
  - `season_start` und `season_end` (Monat 1–12, null=ganzjährig)
- **Alias-Prompt verschärft**: KI muss mindestens 3 spezifische Aliase liefern im Format "Nudeln (Fusilli), Nudeln (Makkaroni), Nudeln (Spaghetti)"
- **Dialog-Layout**: von `max-w-lg` (512px) auf `max-w-4xl` (896px), CSS Grid 3-Spalten-Layout
- **Alle neuen Felder** sind in Create-/Edit-Formularen, im Detail-View und im KI-Prompt enthalten

## Capabilities

### New Capabilities

- `ingredient-scout-fields`: Pfadfinder-relevante Felder (storage_type, cooking_factor, camp_suitable, preparation_time_min, season_start, season_end) auf dem Ingredient-Modell — via API, Formulare und KI-Prompt
- `ingredient-name-suggestion`: KI-generierter spezifischer Name für eine Zutat, der im Dialog angezeigt und vom Nutzer übernommen werden kann

### Modified Capabilities

- `ingredient-ai-suggest`: `portions`/`aliases`/`nutritional_tags` in structured output werden required (nicht optional). Prompt um Name-Vorschlag, Scout-Felder und Alias-Spezifität erweitert. Dialog auf CSS Grid 3-Spalten migriert.
- `ingredient-database`: Ingredient-Modell erhält 6 neue Felder. API-Schemas (Create/Update/Detail) aktualisiert.

## Impact

- **1 Django-Modell**: `Ingredient` in `supply/models/ingredient.py` (+6 Felder)
- **1 Django-Migration**: Neue Felder auf `supply_ingredient`
- **1 Choices-Enum**: `StorageTypeChoices` in `supply/choices.py`
- **2 Backend-Schema-Dateien**: `supply/services/ingredient_ai_suggest_service.py` (Prompt + Pydantic), `supply/schemas/ingredients.py` (API-Schemas)
- **1 Backend-API**: `supply/api/ingredients.py` (Update/Detail passt sich Schema an)
- **1 Zod-Schema-Datei**: `frontend-food/src/schemas/supply.ts`
- **3 Frontend-Komponenten**: `AiSuggestDialog.tsx`, `IngredientDetailPage.tsx`, `IngredientCreatePage.tsx`
- **0 Management Commands** (Felder sind nullable, keine Datenmigration nötig)
