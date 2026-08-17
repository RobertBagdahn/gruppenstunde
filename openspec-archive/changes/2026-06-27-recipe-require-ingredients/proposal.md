## Why

Rezepte ohne Zutaten sind fachlich wertlos: Sie haben keine Nährwerte, keinen Preis, keinen Nutri-Score und können nicht in Essensplänen verwendet werden. Aktuell erlaubt das System Rezepte ohne Zutaten in jedem Status (draft/submitted/approved) — es gibt keine Validierung auf keiner Ebene (DB, API, Frontend). Das führt zu orphan recipes ohne Datenqualität.

## What Changes

- **NEU**: Status-gated validation: Ein Rezept darf nur dann von `draft` nach `submitted` oder `approved` wechseln, wenn es mindestens ein `RecipeItem` (Zutat) hat
- **NEU**: Der `update_recipe`-Endpoint blockiert das Entfernen aller Zutaten bei nicht-draft Rezepten
- **NEU**: Der `update_recipe_visibility`-Endpoint (der `status` auf `submitted` setzt, wenn `visibility=public`) prüft auf vorhandene Zutaten
- **NEU**: Frontend-Hinweis auf Create-Seite aktualisiert zum geänderten Flow
- **NEU**: Frontend-deaktivierter "Veröffentlichen"-Button bei Rezepten ohne Zutaten mit Tooltip
- **MODIFIZIERT**: `recipe/spec.md` — Scenario "Recipe ohne Zutaten" wird aktualisiert, da der Embedding-Fall (draft) weiterhin erlaubt bleibt, aber submitted/approved blockiert wird

## Capabilities

### New Capabilities
- `recipe-ingredient-requirement`: Status-gated validation rule that recipes MUST have at least one RecipeItem before transitioning from draft to submitted/approved. Covers backend API validation, frontend UX for disabled publish controls, and updates to the CreateRecipePage info box.

### Modified Capabilities
<!-- No existing spec-level behavior changes — the `recipe-data-validation` spec covers different validation (quantity heuristics), and `recipe` spec only needs a scenario update. -->

## Impact

- **Backend**: `recipe/api/recipes.py` — validation in `create_recipe` (minor, still allows draft), `update_recipe` (block empty on non-draft), `update_recipe_visibility` (block submit without ingredients)
- **Backend**: `recipe/schemas/recipes.py` — no Pydantic changes needed (validation at API layer, not schema layer)
- **Frontend**: `frontend-food/src/pages/recipes/CreateRecipePage.tsx` — update info box text
- **Frontend**: `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` — disable publish/submit button when no ingredients
- **Specs**: `openspec/specs/recipe/spec.md` — update scenario to reflect status-gated behavior
