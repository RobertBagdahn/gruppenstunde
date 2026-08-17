## Why

Private Rezepte sind durch ID-Enumeration lesbar: Mehrere API-Endpunkte (`recipe-items`, Kommentare, Emotionen, Bilder, AI-Suggest) rufen `get_object_or_404(Recipe, id=...)` ohne Visibility-Filter auf — jeder Nutzer mit einer bekannten ID kann Zutaten und Interaktionen privater Rezepte abrufen. Zusätzlich werden in `RecipeDetailPage` bei manuellen Änderungen die DGE-Mikronährstoff-Deckungsprozentwerte nicht neu berechnet, sodass der Nutzer veraltete Werte sieht.

## What Changes

- **SECURITY**: `list_recipe_items`, `list_recipe_comments`, `create_recipe_comment`, `toggle_recipe_emotion`, `get_similar_recipes`, `upload_recipe_image`, `delete_recipe_image`, `ai_suggest_all` — alle erhalten einen Visibility-Filter (`_get_visible_recipes_qs`) statt des nackten `get_object_or_404`
- **SECURITY**: `suggest_ingredients`-Endpunkt bekommt eine Obergrenze für den `limit`-Parameter (max. 50) und einen Auth-Check
- **FIX**: `RecipeDetailPage` berechnet bei `isDirty=true` die DGE-Coverage-Werte (`dge_coverage`, `dge_reference`) neu statt die veralteten Backend-Werte zu verwenden
- **FIX**: `RecipeDetailPage` setzt `0` für Vitamin C korrekt (nicht `null` via `|| null`)
- **FIX**: `fork_recipe` normalisiert `portions=1` konsistent wie `create_recipe`

## Capabilities

### New Capabilities

- `recipe-visibility-enforcement`: Alle Recipe-API-Endpunkte wenden einheitlich den Visibility-Filter an — private Rezepte sind nur für Owner/Autoren sichtbar, auch bei Subaccessoren wie Items, Kommentaren, Bildern und AI-Aktionen

### Modified Capabilities

_(keine Spec-Level-Anforderungsänderungen)_

## Impact

- **Backend**: `recipe/api/recipes.py`, `recipe/api/items.py`, `supply/api/ingredients.py`
- **Frontend**: `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`
- **Keine Migrationen** erforderlich
- **Keine Breaking Changes** für legitime Nutzer (Sichtbarkeit war schon immer die Intention)
