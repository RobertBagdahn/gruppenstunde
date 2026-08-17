## 1. recipe/signals.py: dispatch_uid auf alle Handler

- [x] 1.1 `recalculate_recipe_cache_on_item_change` (post_save + post_delete für RecipeItem): `dispatch_uid` ergänzen
- [x] 1.2 `invalidate_recipes_on_ingredient_change` (post_save + post_delete für Ingredient): `dispatch_uid` ergänzen
- [x] 1.3 `invalidate_recipes_on_portion_change` (post_save + post_delete für Portion): `dispatch_uid` ergänzen
- [x] 1.4 `invalidate_recipes_on_measuring_unit_change` (post_save für MeasuringUnit): `dispatch_uid` ergänzen
- [x] 1.5 **NEU**: `post_delete`-Handler für `MeasuringUnit` ergänzen (bisher fehlend) mit `dispatch_uid`
- [x] 1.6 `sync_recipe_allergens_on_item_change` (post_save + post_delete RecipeItem): `dispatch_uid` ergänzen
- [x] 1.7 `update_recipe_quality_score` (post_save Recipe): `dispatch_uid` ergänzen
- [x] 1.8 `update_recipe_embedding` (post_save Recipe): `dispatch_uid` ergänzen; Stale-Instance fixen (Design D4)
- [x] 1.9 `update_type_stats_on_recipe_change` (post_save + post_delete Recipe): `dispatch_uid` ergänzen

## 2. planner/signals.py: dispatch_uid + usage_count absichern

- [x] 2.1 `track_previous_recipe` (pre_save MealItem): `dispatch_uid` ergänzen
- [x] 2.2 `increment_usage_count_on_create` (post_save MealItem): `dispatch_uid` ergänzen
- [x] 2.3 `update_usage_count_on_change` (post_save MealItem): `dispatch_uid` ergänzen
- [x] 2.4 `decrement_usage_count_on_delete` (post_delete MealItem): `dispatch_uid` ergänzen
- [x] 2.5 Alle `F("usage_count") - 1` → `Greatest(F("usage_count") - 1, 0)` ersetzen; `from django.db.models.functions import Greatest` importieren

## 3. supply/signals.py: tracker-Bug und dispatch_uid

- [x] 3.1 Alle Signal-Handler (6 Stück): `dispatch_uid` ergänzen
- [x] 3.2 `_embedding_fields_changed`: `instance.tracker`-Referenz entfernen; stattdessen `update_fields`-Parameter aus Signal-kwargs prüfen (Design D2)
- [x] 3.3 Nicht-existente Feldnamen aus `relevant`-Set entfernen (`short_description`, `uses`, `source`, `regional_months`, `aliases`)
- [x] 3.4 `"environment_score"` → `"environmental_score"` korrigieren (Tippfehler)

## 4. Tests

- [x] 4.1 Test: RecipeItem speichern — `recalculate_recipe_cache` feuert genau einmal (nicht doppelt)
- [x] 4.2 Test: MealItem löschen — `usage_count` ist nie < 0
- [x] 4.3 Test: Ingredient speichern — Quality-Score-Update feuert (kein AttributeError mehr)
- [x] 4.4 Test: MeasuringUnit löschen — Recipe-Cache wird invalidiert
