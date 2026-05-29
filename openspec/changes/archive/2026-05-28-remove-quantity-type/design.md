## Context

`RecipeItem` hat ein Feld `quantity_type` mit den Optionen `per_person` und `once`. In der Praxis wird dieses Feld weder in der Frontend-Anzeige (`IngredientList.tsx`) noch im Shopping-Service korrekt berücksichtigt — alle Mengen werden identisch behandelt. Das führt zu falschen Berechnungen. Die Vereinfachung: alle Mengen sind immer pro Person.

**Betroffene Dateien:**
- `backend/recipe/models/items.py` — `RecipeItem.quantity_type` Feld
- `backend/supply/choices.py` — `MaterialQuantityType` enum
- `backend/recipe/schemas/items.py` — Pydantic-Schemas
- `backend/supply/services/shopping_service.py` — Berechnung
- `backend/recipe/services/recipe_checks.py` — Nährwert-Berechnung
- `backend/recipe/management/commands/import_cooklang.py`
- `backend/recipe/management/commands/import_legacy_food.py`
- `frontend-food/src/schemas/recipe.ts` — Zod
- `frontend-food/src/schemas/supply.ts` — Zod
- `frontend-food/src/schemas/content.ts` — Zod
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`
- `frontend-food/src/pages/recipes/CreateRecipePage.tsx`
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`

## Goals / Non-Goals

**Goals:**
- `quantity_type` Feld komplett entfernen (Model, Schemas, Frontend)
- Bestehende `once`-Daten korrekt migrieren (durch `servings` teilen)
- Vereinfachte, fehlerfreie Mengenberechnung

**Non-Goals:**
- Änderung der Anzeigelogik (IngredientList, formatQuantity etc.)
- Änderung der Portion/weight_g-Berechnung
- Neue Features

## Decisions

### 1. Daten-Migration für bestehende `once`-Einträge

**Entscheidung:** RunPython-Migration die `once`-Items umrechnet: `quantity = quantity / recipe.servings`

**Rationale:** Damit werden bestehende Rezepte korrekt dargestellt. Ein `once`-Item mit quantity=100 bei servings=4 wird zu quantity=25 (pro Person).

**Alternative:** Einfach löschen und Feld entfernen ohne Umrechnung — riskiert falsche Mengen bei existierenden Rezepten.

### 2. `MaterialQuantityType` Choices-Klasse behalten oder entfernen?

**Entscheidung:** Komplett entfernen. Wird nirgendwo anders verwendet.

### 3. API-Änderung

**Entscheidung:** `quantity_type` aus allen Request/Response-Schemas entfernen. Breaking Change, kein Deprecation-Pfad nötig (aktive Entwicklung).

## Risks / Trade-offs

- **[Datenverlust bei once-Items]** → Mitigation: RunPython-Migration rechnet korrekt um bevor Feld entfernt wird
- **[Edge Case: quantity_type=once mit servings=0]** → Mitigation: In Migration abfangen, Division durch 0 vermeiden (Default servings=1)
