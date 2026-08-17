## Why

Das `quantity_type`-Feld (`per_person`/`once`) auf `RecipeItem` verursacht Berechnungsfehler: Die Anzeigelogik (IngredientList) und die Shopping-Service-Berechnung ignorieren den Typ komplett und behandeln alle Mengen gleich. Das führt zu unsinnigen Ergebnissen wie "1,3 kg Paprikaschote pro Portion". Die Unterscheidung bringt keinen echten Mehrwert — alle Mengen sollen einheitlich pro Person gespeichert werden.

## What Changes

- **BREAKING**: `RecipeItem.quantity_type` Feld entfernen (Django Model + Migration)
- **BREAKING**: `MaterialQuantityType` Choices-Klasse entfernen
- Pydantic-Schemas: `quantity_type` Feld aus `RecipeItemSchema`, `RecipeItemCreateSchema` etc. entfernen
- Zod-Schemas: `quantity_type` aus `recipe.ts` und `supply.ts` entfernen
- Frontend-Editor: Keine `quantity_type`-Zuweisung mehr bei Erstellung
- Import-Commands: `quantity_type`-Zuweisungen entfernen
- AI-Estimation: `quantity_per_person` Feld-Name ggf. vereinfachen

## Capabilities

### New Capabilities

(keine)

### Modified Capabilities

- `recipe`: RecipeItem-Schema verliert `quantity_type` — alle Mengen sind implizit pro Person
- `supply-base`: `MaterialQuantityType` Choices-Klasse wird entfernt

## Impact

- **Backend Apps**: `recipe` (Model, Schemas, API), `supply` (Choices)
- **Migrations**: Eine Migration für `recipe` (RemoveField)
- **Pydantic-Schemas**: `backend/recipe/schemas/items.py`
- **Zod-Schemas**: `frontend-food/src/schemas/recipe.ts`, `frontend-food/src/schemas/supply.ts`
- **Frontend-Komponenten**: `InlineIngredientEditor.tsx`, `CreateRecipePage.tsx`, `RecipeDetailPage.tsx`
- **Services**: `shopping_service.py`, `recipe_checks.py`
- **Import-Commands**: `import_cooklang.py`, `import_legacy_food.py`
- **Daten-Migration**: Bestehende `once`-Einträge müssen ggf. umgerechnet werden (quantity / servings)
