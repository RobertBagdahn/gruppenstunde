## Why

Die Nutrition-Breakdown-API gibt `per_serving_*`-Feldnamen zurück, aber das Frontend-Zod-Schema erwartet bereits `per_portion_*` (aus dem `servings→portions`-Rename). Diese Inkonsistenz führt zu einem Zod-Validation-Error, der `nutritionBreakdown` auf `undefined` setzt – wodurch sämtliche Analyse-Accordions (Preis, Inhaltsstoffe, Gesundheit, Gewicht) unsichtbar werden.

## What Changes

**BREAKING** – Feld-Rename `per_serving_*` → `per_portion_*` im gesamten Stack:

- **Backend Pydantic Schema** (`recipe/schemas/nutrition.py`): `per_serving_energy_kcal` → `per_portion_energy_kcal` (und alle 4 weiteren Felder)
- **Backend API** (`recipe/api/nutrition.py`): Dict-Keys in der Response anpassen
- **Frontend Zod Schema** (`schemas/recipe.ts`): Bereits auf `per_portion_*` – muss validiert werden
- **Frontend RecipeDetailPage** (`pages/recipes/RecipeDetailPage.tsx`): Alle `nb.per_serving_*`-Referenzen auf `nb.per_portion_*` umstellen (18 Vorkommen in previews, nutrient cards, pie chart, health indicators)

## Capabilities

### New Capabilities
*(keine – reiner Rename/Fix)*

### Modified Capabilities
*(keine – implementierungsspezifischer Fix, keine Spec-Änderung)*

## Impact

- **`backend/recipe/schemas/nutrition.py`**: `RecipeNutritionBreakdownOut` – 5 Feldnamen ändern
- **`backend/recipe/api/nutrition.py`**: Dict-Response – 5 Keys ändern
- **`frontend-food/src/schemas/recipe.ts`**: `RecipeNutritionBreakdownSchema` – bereits korrekt, nur verifizieren
- **`frontend-food/src/pages/recipes/RecipeDetailPage.tsx`**: 18 `nb.per_serving_*` → `nb.per_portion_*` Referenzen
- **Keine Migration notwendig** (reine API-Response-Änderung, kein DB-Schema)
