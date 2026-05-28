## Why

Das aktuelle `RecipeHint`-Model ist zu komplex (separate `min_value`/`max_value`, `range`-Option) für den tatsächlichen Anwendungsfall. Die ursprünglichen Hint-Regeln aus dem Inspi-Altprojekt verwenden ein einfaches Schema: ein `value`-Schwellenwert mit `min_max`-Richtung. Zusätzlich fehlt eine Frontend-Pflegemaske — Regeln können nur über den Django-Admin verwaltet werden.

## What Changes

- **BREAKING**: `RecipeHint`-Model vereinfachen — `min_value`/`max_value` durch einzelnes `value`-Feld ersetzen, `range`-Option aus `HintMinMaxChoices` entfernen
- **BREAKING**: `hint_level`-Choices ändern: `"warning"` → `"warn"` (passend zu Legacy-Daten)
- **BREAKING**: `recipe_type` und `recipe_objective` werden Pflichtfelder (kein `blank=True`)
- Neues `hint`-Feld (CharField) für den angezeigten Hinweis-Text
- `match_recipe_hints()`-Service vereinfachen (kein Range-Matching mehr)
- Frontend: `hint`-Text als `recommendation_text` in Improvement-Cards anzeigen
- Frontend: `hint_level` visuell differenzieren (warn=amber, error=rot)
- Neue Frontend-CRUD-Page `/admin/recipe-hints` (Staff-only) zur Regelpflege
- Fixture mit Legacy-Hint-Daten als Seed

## Capabilities

### New Capabilities
- `recipe-hint-admin`: Staff-only CRUD-Frontend-Page zur Pflege von RecipeHint-Regeln unter `/admin/recipe-hints`

### Modified Capabilities
- `recipe`: RecipeHint-Model-Vereinfachung, geänderte Matching-Logik, Frontend-Darstellung mit hint_level-Farben

## Impact

- **Backend**: `recipe/models/hints.py`, `supply/choices.py` (HintLevelChoices, HintMinMaxChoices), `recipe/services/recipe_checks.py`, `recipe/services/improvement_ranking_service.py`, `recipe/schemas/nutrition.py`
- **Frontend**: `schemas/recipe.ts`, `schemas/supply.ts`, `components/recipe/RecipeImprovements.tsx`, neue Page `pages/admin/RecipeHintAdminPage.tsx`
- **Pydantic-Schema**: `RecipeHintOut` anpassen (neues `hint`-Feld, `value` statt `min_value`/`max_value`)
- **Zod-Schema**: `RecipeHintSchema` synchronisieren
- **Migration**: Destructive — `min_value`/`max_value` entfernen, `value` hinzufügen, `hint` hinzufügen
- **API**: Neuer CRUD-Router für RecipeHints (Staff-only)
