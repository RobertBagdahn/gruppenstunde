## Why

Der Chefkoch-URL-Import (Enhanced) hat einen kritischen Bug: Beim Speichern gehen alle Zutaten verloren, weil das Frontend `ingredient_id` sendet, der Backend-Endpoint aber `portion_id` erwartet (HTTP 422). Außerdem befüllt der Import nur Titel, Beschreibung und Portionen — alle anderen Rezeptfelder (Kurzbeschreibung, Schwierigkeit, Zubereitungszeit, Rezepttyp, Altersgruppen, Tags, Kosten) bleiben leer und müssen manuell ausgefüllt werden.

## What Changes

- **BREAKING**: `RecipeItemDraftResult` liefert zusätzlich `portion_id` (aufgelöst oder neu erstellt)
- Gemini-Prompt im Enhanced-Import erweitert: liefert jetzt auch `summary`, `recipe_type`, `difficulty`, `execution_time`, `preparation_time`, `costs_rating`, `scout_level_ids`, `tag_ids`
- Verfügbare ScoutLevels und Tags werden aus der DB geladen und im Prompt mitgegeben
- Fehlende Portionen werden automatisch erstellt mit geschätztem `weight_g` (aus Gemini-Output)
- Frontend sendet `portion_id` statt `ingredient_id` beim Speichern der RecipeItems
- Neue Zutaten werden in der Import-Vorschau als "NEU" markiert (`is_new_ingredient` Flag bereits vorhanden)
- Vorschau zeigt lesbare Zutatennamen statt technischer Feldbezeichner

## Capabilities

### New Capabilities

- `recipe-import-field-completion`: Gemini befüllt beim URL-Import alle Rezept-Metafelder automatisch (summary, recipe_type, difficulty, times, costs, scout_levels, tags)

### Modified Capabilities

- `recipe-url-import`: Portion-Auflösung im Import-Service, Frontend-Save verwendet `portion_id`

## Impact

- **Backend**: `recipe/services/url_import_service.py` (Gemini-Prompt, Structured Output Schema, `_build_recipe_items`), `recipe/api/recipes.py` (Response-Schema)
- **Frontend**: `frontend-food/src/pages/recipes/CreateRecipePage.tsx` (Save-Logik, Vorschau-UI), `frontend-food/src/api/recipeImport.ts` (Zod-Schema erweitern)
- **Pydantic-Schemas**: `GeminiRecipeExtraction`, `RecipeItemDraftResult`, `UrlImportResult`, `RecipeDraftSchema` erweitern
- **Zod-Schemas**: `RecipeImportUrlResponseSchema`, `RecipeItemDraftSchema`, `RecipeDraftSchema` erweitern
- **Keine Migrations nötig** — nur Logik- und Schema-Änderungen
