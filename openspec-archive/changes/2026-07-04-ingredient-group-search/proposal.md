## Why

Zutaten wie Fusilli, Spaghetti und Penne haben gemeinsame Hyperonyme (z.B. "Nudeln"), die in der Zutatensuche nicht abgedeckt werden. Bisher wird nur nach `name` und `aliases__name` gesucht — eine Gruppen-Zuordnung für die Suche fehlt.

## What Changes

- Neues Model `IngredientGroup` (name, slug) — einfach, kein generisches Tag-System
- M2M `groups` auf `Ingredient`
- `GET /api/ingredients/` sucht zusätzlich in `groups__name__icontains` + neuer `?group=` Filter
- `GET /api/ingredients/suggest/` findet auch via Gruppennamen
- CRUD-Endpoints unter `/api/ingredient-groups/`
- `groups` in `IngredientListOut` und `IngredientDetailOut` exponiert
- `group_ids` in `IngredientCreateIn` / `IngredientUpdateIn`
- Frontend: Gruppen-Filter-Pills + Anzeige in `IngredientDetailSearchDialog`
- Zod-Schemas synchron gehalten

## Capabilities

### New Capabilities
- `ingredient-group-search`: Zutaten in Gruppen zusammenfassen und darüber suchen

### Modified Capabilities

(keine)

## Impact

- **Backend**: `supply/models/ingredient.py`, `supply/schemas/`, `supply/api/`, `supply/services/fuzzy_match.py`
- **Frontend**: `frontend-food/src/schemas/supply.ts`, `frontend-food/src/api/supplies.ts`, `frontend-food/src/components/recipe/IngredientDetailSearchDialog.tsx`
- **Datenbank**: Neue Migration `supply.0047_ingredientgroup_ingredient_groups`
