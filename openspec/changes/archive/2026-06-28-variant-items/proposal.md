## Why

Der aktuelle `MealItemSplit`-Ansatz speichert Varianten-Anteile versteckt in einer separaten Tabelle und liefert sie nicht an die UI aus. Nutzer sehen nicht, welche Varianten konfiguriert sind, und können die Verteilung nicht nachträglich anpassen. Das System wird durch einen neuen Ansatz ersetzt: Jede Variante wird ein eigenständiges MealItem mit editierbarem `factor`.

## What Changes

- **BREAKING**: `MealItemSplit`-Model wird entfernt, inkl. `MealItemSplitIn`/`MealItemSplitOut`-Schemas, drei API-Endpunkte (GET/PUT/DELETE splits/), und `split_service.py` mit `get_included_fractions`, `get_split_delta_total`, `largest_remainder_round`.
- **BREAKING**: `unique_recipe_per_meal`-Constraint auf `MealItem` wird entfernt — erlaubt mehrere Items desselben Rezepts in einer Mahlzeit (für Varianten).
- **NEU**: `active_recipe_item_ids` (JSONField) auf `MealItem` — speichert welche RecipeItem-IDs in dieser Variante aktiv sind.
- **NEU**: `variant_group_id` (UUIDField) auf `MealItem` — gruppiert Varianten desselben Batch-Durchgangs für eingerückte Darstellung.
- **NEU**: `POST .../items/batch/`-Endpunkt erstellt mehrere MealItems atomar.
- **NEU**: `VariantSliderDialog` ersetzt `SplitConfigDialog` — zeigt alle kombinierten Varianten mit Schiebereglern, die auf `effectivePortions` summieren.
- **NEU**: Factor INLINE editierbar im Tagesplan (z.B. "0.33" = 33%).
- **NEU**: Items mit `factor < 0.01` werden im Tagesplan ausgeblendet.
- **DEL**: Recipe-Delete-Protection und RecipeItem-Edit-Protection über `MealItemSplit` entfällt — ersetzt durch `active_recipe_item_ids`-basierte Prüfung.

## Capabilities

### New Capabilities
- `variant-items`: Erzeugung, Speicherung, Darstellung und Bearbeitung von Rezept-Varianten als eigenständige MealItems mit Factor + active RecipeItem IDs

### Modified Capabilities
- `meal-item-splits`: Wird **ersetzt** durch `variant-items`. Das gesamte Spec entfällt.
- `recipe-exchanges`: Delete-Protection über MealItemSplit entfällt. Neue Protection über active_recipe_item_ids.
- `recipe-optional-items`: Delete-Protection über MealItemSplit entfällt. Neue Protection über active_recipe_item_ids.

## Impact

- **Backend**: planner/models/meal_plan.py (Model-Änderungen + Constraint-Removal), planner/schemas/meal_plan.py (neue Felder), planner/api/meal_plan.py (neuer Batch-Endpunkt, 3 alte Endpunkte entfernt), planner/services/split_service.py (GANZ entfernt), supply/services/shopping_service.py (get_included_fractions durch neue Logik ersetzt), planner/services/pdf_export.py (item.splits.all() ersetzen), recipe/api/items.py + recipes.py (Delete-Protection umstellen), planner/migrations/ (neue Migration + Reverse der alten), recipe/tests/test_exchanges_and_splits.py (komplett überarbeiten).
- **Frontend**: schemas/mealPlan.ts (MealItemSplit-Schemas entfernt, neue Felder), api/mealPlans.ts (Split-Hooks entfernt, neuer Batch-Hook), components/meal/SplitConfigDialog.tsx (ersetzt durch VariantSliderDialog), pages/planning/MealEventDetailPage.tsx (Dialog-Integration + inline Factor-Edit).
- **OpenSpec**: specs/meal-item-splits/spec.md entfernt, specs/recipe-exchanges/spec.md + recipe-optional-items/spec.md aktualisiert.
