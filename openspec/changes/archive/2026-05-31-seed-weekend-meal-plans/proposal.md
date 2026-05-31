## Why

Die bestehenden Seed-MealPlans (Sommerlager 7 Tage, Pfingstlager 4 Tage) sind zu groß und zu generisch, um als Referenz für typische Pfadfinder-Wochenenden zu dienen. Es fehlen kurze, realistische 2.5-Tage-Menüs (Fr Abend → So Mittag) mit konkreter Rezeptzuordnung, festen Zeiten und Snacks. Außerdem fehlen gängige Rezepte wie Gulasch, Chili con Carne, Porridge, Brotzeit und Grillwürstchen.

## What Changes

- 3 neue Zutaten (Gewürze: Paprikapulver, Kreuzkümmel, Chilipulver) im Seed
- 5 neue Rezepte mit RecipeItems: Gulasch, Chili con Carne, Porridge, Brotzeit, Grillwürstchen
- 10 Wochenend-MealPlans (Fr 17:00–So 14:00) mit realistischen Parametern (Personenzahl 8–35, activity_factor, reserve_factor, budget)
- Jeder MealPlan nutzt `create_meals_for_date_timeaware()` für korrekte Mahlzeiten-Erzeugung (Fr nur Abendessen, So nur Frühstück + Mittag)
- Jede Mahlzeit erhält ein konkretes Rezept als MealItem, Obstsalat als fester Snack
- Deployment: Seed lokal + auf Prod via cloud-sql-proxy ausführen

## Capabilities

### New Capabilities
- `weekend-meal-plan-seeds`: 10 typische Wochenend-Menüs als Seed-Daten mit 5 neuen Rezepten und 3 neuen Zutaten

### Modified Capabilities

_(keine Requirement-Änderungen an bestehenden Specs)_

## Impact

- **Backend**: `core/management/commands/seed_all.py` — Erweiterung von `_seed_recipes()` und `_seed_planner()`
- **Models**: Keine Änderungen, keine Migrations nötig
- **Schemas**: Keine Änderungen (nur Daten, keine API-/Schema-Änderungen)
- **Deployment**: Seed-Command muss auf Prod ausgeführt werden (cloud-sql-proxy → `uv run python manage.py seed_all --only planner`)
- **Betroffene Apps**: `core`, `recipe`, `supply`, `planner`
