## Why

`RecipeItem.quantity` hat eine inkonsistente Semantik: manchmal bedeutet es "Gramm" (Inline-Editor), manchmal "Anzahl Portionen" (Import/AI). Zusammen mit einem optionalen `portion_id` führt das zu falschen Anzeigen (z.B. "2g grüner Tee" wird zu "1 kg grüner Tee, ca. 2 Packungen"). Der Bug wurde mehrfach gemeldet und nie richtig behoben, weil das Datenmodell die Wurzel des Problems ist.

## What Changes

- **BREAKING**: `RecipeItem.portion` wird Pflichtfeld (nicht mehr nullable)
- **BREAKING**: `RecipeItem.ingredient` Feld wird entfernt (redundant: `portion.ingredient`)
- **BREAKING**: `RecipeItem.measuring_unit` Feld wird entfernt (redundant: `portion.measuring_unit`)
- **BREAKING**: `Portion.measuring_unit` wird Pflichtfeld (nicht mehr nullable)
- `Portion.weight_g` bekommt `MinValueValidator(0.01)`, wird per Signal berechnet
- `Portion.name` default wird `"g"`
- `RecipeItem` bekommt CheckConstraint `quantity > 0`
- Jede Ingredient bekommt automatisch eine Basis-Portion ("1g" oder "1ml")
- Datenmigration: bestehende Items ohne `portion_id` werden auf Basis-Portion gemappt
- Frontend Inline-Editor speichert immer mit `portion_id`
- AI-Estimate berechnet quantity relativ zur aktuellen Portion
- View-Logik vereinfacht sich: `weightG = quantity × portion.weight_g` (immer)

## Capabilities

### New Capabilities

- `recipe-item-portion-model`: Datenmodell-Bereinigung RecipeItem/Portion mit Pflichtfeldern und Constraints

### Modified Capabilities

- `recipe-inline-edit`: Editor muss Portion-basiert speichern statt rohe Gramm
- `recipe-quantity-display`: View-Logik vereinfacht sich auf `quantity × portion.weight_g`
- `recipe-ai-ingredients`: AI-Estimate muss Portion berücksichtigen

## Impact

- **Backend Apps**: `recipe` (Model, API, Schemas, Signals), `supply` (Portion Model, Validators)
- **Migrations**: Datenmigration für bestehende RecipeItems + Basis-Portionen erstellen
- **Pydantic Schemas**: `RecipeItemOut`, `RecipeItemCreateIn`, `RecipeItemUpdateIn` — `ingredient_id` und `measuring_unit_id` entfernen, `portion_id` Pflicht
- **Zod Schemas**: `RecipeItemSchema` in `frontend-food/src/schemas/recipe.ts` anpassen
- **Frontend**: `InlineIngredientEditor.tsx`, `IngredientList.tsx`, `portionDisplay.ts`, `unitConversion.ts`
- **AI Service**: `ai_ingredients_service.py` — Estimate-Rückgabe anpassen
