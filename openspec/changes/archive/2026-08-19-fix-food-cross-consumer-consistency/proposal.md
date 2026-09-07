## Why

Die Food-Domänenlogik (Zutat ↔ Rezept ↔ Essensplan ↔ Einkaufsliste) berechnet dieselben Daten an **vier unabhängigen Stellen** unterschiedlich: Einkaufsliste, Nährwert-Cockpit, `nutrition-summary` und `cost-summary`. Konkret widersprechen sich die Ansichten bei Rezepten mit Austausch-Gruppen oder optionalen Zutaten ohne getroffene Variantenwahl, und soft-gelöschte Portionen sowie Austausch-Alternativen sickern in Teilberechnungen (Energie, Kosten, Kochplan, Nutritional-Tags) ein. Nutzer sehen dadurch widersprüchliche Mengen, Preise und Allergie-Warnungen.

## What Changes

- **Vereinheitlichte Auflösung aktiver Rezept-Zutaten**: `nutrition_summary` und `cost_summary` nutzen künftig den kanonischen Resolver `active_recipe_items()` statt eigener, fehlerhafter Inline-Logik. Dadurch gilt der spezifizierte Default (Optionals eingeschlossen, Austausch-Gruppe → position 0) in allen Konsumenten identisch.
- **Soft-deleted Portionen fließen nicht mehr in Berechnungen ein**: `_resolve_ingredient_weight_g` filtert `deleted_at__isnull=True` (betrifft Energie/Kosten-Resolvers, Kochplan und Kochplan-PDF), und Portionsoptionen in der Einkaufsliste blenden gelöschte Portionen aus.
- **Nutritional-Tag-Sync korrigiert**: `sync_recipe_nutritional_tags` schließt Austausch-Alternativen (`exchange_position > 0`) und soft-deleted Portionen aus, damit die AND-Schnittmenge nicht durch inaktive Zutaten verfälscht wird (betrifft den Zutaten-Radar).
- **`portion_display` interpretiert `quantity` pro Person** statt als Gesamtmenge (konsistent mit allen anderen Berechnungen).
- **Robustheit**: Schutz vor `ZeroDivisionError` bei `reserve_factor = 0`; `get_recipe_total_weight_g`-Fallback schließt Austausch-Alternativen aus; toter Code (`compute_variant_contributions`) wird entfernt.

## Capabilities

### New Capabilities
- `food-active-ingredient-resolution`: Kanonische, in allen Berechnungs-Konsumenten einheitlich verwendete Auflösung aktiver Rezept-Zutaten (Austausch-Gruppen, Optionals, Overrides, soft-deleted Portionen).
- `recipe-nutritional-tag-sync`: Der Nutritional-Tag-Sync (AND-Schnittmenge über Zutaten) ignoriert Austausch-Alternativen und soft-gelöschte Portionen.

### Modified Capabilities
- `direct-ingredient-weight-resolution`: `_resolve_ingredient_weight_g` MUSS soft-gelöschte Portionen ausschließen; `portion_display` MUSS `quantity` als Pro-Person-Menge interpretieren.

## Impact

- **Backend-Planner**: `planner/api/meal_plan.py` (`nutrition_summary`, `cost_summary`, `shopping_list`), `planner/services/calculation_context.py`, `planner/services/meal_item_helpers.py`, `planner/services/cooking_schedule_service.py`, `planner/services/cooking_schedule_pdf.py`, `planner/schemas/meal_plan.py` (`resolve_portion_display`).
- **Backend-Recipe**: `recipe/services/recipe_checks.py` (`sync_recipe_nutritional_tags`, `get_recipe_total_weight_g`).
- **Backend-Supply**: `supply/services/shopping_service.py` (`_enrich_display_fields`).
- **Keine** DB-Migrationen, **keine** API-Response-Form-Änderungen (reine Berechnungs-/Filter-Logik), **keine** Frontend-Änderungen nötig.
- **Tests**: `planner/tests/`, `recipe/tests/`, `supply/tests/` — neue Tests für den Leer-Auswahl-Fall (Varianten/Optional) und soft-deleted Portionen.
