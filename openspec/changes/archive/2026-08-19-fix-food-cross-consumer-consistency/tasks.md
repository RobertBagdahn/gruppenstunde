## 1. Kanonische Auflösung aktiver Rezept-Zutaten

- [x] 1.1 `nutrition_summary` in `planner/api/meal_plan.py` auf `active_recipe_items(mi)` umstellen (Inline-Auswahl-Logik entfernen)
- [x] 1.2 `cost_summary` in `planner/api/meal_plan.py` auf `active_recipe_items(mi)` umstellen
- [x] 1.3 Tests für den Leer-Auswahl-Fall (Austausch-Gruppe → position 0, Optional → eingeschlossen) in `planner/tests/` ergänzen

## 2. Soft-deleted Portionen aus Berechnungen ausschließen

- [x] 2.1 `_resolve_ingredient_weight_g` in `planner/services/meal_item_helpers.py`: `deleted_at__isnull=True` im Portion-Lookup und im Default-Portion-Fallback ergänzen
- [x] 2.2 `get_recipe_nutritional_values` / `recalculate_recipe_cache` in `recipe/services/recipe_checks.py`: soft-deleted Portionen ausschließen
- [x] 2.3 `_enrich_display_fields` in `supply/services/shopping_service.py`: soft-deleted Portionen aus `portion_options`/`natural_portions` ausschließen
- [x] 2.4 Tests: soft-deleted Portion wird in Energie/Kosten, Rezept-Aggregation und Portionsoptionen ignoriert

## 3. Nutritional-Tag-Sync korrigieren

- [x] 3.1 `sync_recipe_nutritional_tags` in `recipe/services/recipe_checks.py`: Austausch-Alternativen (`exchange_position > 0`) und soft-deleted Portionen ausschließen
- [x] 3.2 Tests für die AND-Schnittmenge mit Austausch-Gruppe und soft-deleted Portion in `recipe/tests/` ergänzen

## 4. portion_display & Robustheit

- [x] 4.1 `resolve_portion_display` in `planner/schemas/meal_plan.py`: `quantity` pro Person interpretieren (Division durch `norm_portions` entfernen)
- [x] 4.2 `generate_shopping_list` in `supply/services/shopping_service.py`: `ZeroDivisionError`-Schutz bei `reserve_factor = 0`
- [x] 4.3 `get_recipe_total_weight_g`-Fallback in `recipe/services/recipe_checks.py`: Austausch-Alternativen ausschließen
- [x] 4.4 `compute_variant_contributions` in `planner/services/variant_service.py` entfernen (toter Code)
- [x] 4.5 Tests: `portion_display`-Pro-Person-Semantik und Reserve-Schutz

## 5. Verifikation

- [x] 5.1 `uv run python manage.py makemigrations --check` (sollte keine neuen Migrationen melden)
- [x] 5.2 `uv run pytest` (backend) grün
- [ ] 5.3 `uv run ruff check` und `uv run mypy` (backend) grün
