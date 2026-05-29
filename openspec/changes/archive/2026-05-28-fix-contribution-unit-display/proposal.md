## Why

Die "Verbesserungsvorschläge" auf der Rezept-Detailseite zeigen bei jedem Hauptverursacher die Einheit `g` an — auch wenn der Parameter `energy_kj` ist. Dadurch wird z.B. "Vanillezucker 2096g" angezeigt, obwohl der korrekte Wert "2096 kJ" wäre. Das verwirrt Nutzer und untergräbt das Vertrauen in die Nährwertanzeige.

## What Changes

- Backend: Das Schema `SuggestedIngredientOut` erhält ein `unit`-Feld, damit das Frontend die korrekte Einheit anzeigen kann
- Backend: `_find_contributing_ingredients` und `_format_ingredients` geben die Einheit des Parameters mit zurück
- Frontend: `RecipeImprovements.tsx` zeigt die dynamische Einheit statt hart-kodiertem `g` an
- **BREAKING**: Pydantic-Schema `SuggestedIngredientOut` bekommt ein neues Pflichtfeld `unit`

## Capabilities

### New Capabilities

_(keine)_

### Modified Capabilities

_(keine — es handelt sich um einen Bugfix in bestehender Logik, keine Requirement-Änderung)_

## Impact

- **Backend**: `recipe/services/improvement_ranking_service.py` (`_format_ingredients`), `recipe/services/nutri_improvement_service.py` (`_find_contributing_ingredients`), `recipe/schemas/nutrition.py` (`SuggestedIngredientOut`)
- **Frontend**: `frontend-food/src/components/recipe/RecipeImprovements.tsx`, `frontend/src/components/recipe/RecipeImprovements.tsx`
- **Schemas**: Pydantic `SuggestedIngredientOut` + Zod-Äquivalent müssen synchronisiert werden
- **Migrations**: Keine (nur Code-Änderung, kein DB-Schema betroffen)
