## MODIFIED Requirements

### Requirement: Frühstücks-Seed-Rezepte bereitstellen

Das System SHALL über einen Management Command einen Katalog vordefinierter **warmer** Frühstücks-Rezepte mit `recipe_type=breakfast` erstellen (z.B. Rührei, Pfannkuchen). Brot+Belag-Kombinationen sowie reine Getränke werden NICHT mehr als Rezepte angelegt — sie laufen über den Frühstücks-Wizard.

Zusätzlich SHALL der Command Portionen für ALLE Basis-Zutaten (Tag `breakfast-base`) und Belag-Zutaten (Tag `breakfast-topping`) sowie benötigte MeasuringUnits anlegen.

#### Scenario: Seed-Command erstellt warme Gerichte und Portionen
- **WHEN** `uv run python manage.py seed_breakfast_recipes` ausgeführt wird
- **THEN** werden warme Frühstücks-Rezepte (idempotent, Slug-basierte Dedup) erstellt
- **AND** für jede Basis-Zutat wird eine Portion(name="Scheibe", weight_g=standard_recipe_weight_g) angelegt
- **AND** für jede Belag-Zutat werden Portionen(name="Belag knapp", name="Belag normal", name="Belag üppig") mit den jeweiligen Portionsgewichten angelegt

## ADDED Requirements

### Requirement: Portionen für Basis- und Belag-Zutaten

Das System SHALL für jede Zutat mit Tag `breakfast-base` eine Portion "Scheibe" mit `measuring_unit_id` der neu angelegten MeasuringUnit "Scheibe" und `weight_g = standard_recipe_weight_g` anlegen.

Das System SHALL für jede Zutat mit Tag `breakfast-topping` drei Portionen anlegen:
1. "Belag knapp" mit dem Gewicht der knappen Portion (aus dem Catalog-Portionen)
2. "Belag normal" mit dem Default-Portionsgewicht
3. "Belag üppig" mit dem Gewicht der üppigen Portion

#### Scenario: Basis-Zutat bekommt Scheibe-Portion
- **WHEN** der Seed läuft und Bauernbrot (standard_recipe_weight_g=18) hat Tag `breakfast-base`
- **THEN** wird eine Portion(name="Scheibe", measuring_unit=Scheibe, weight_g=18) für Bauernbrot angelegt

#### Scenario: Belag-Zutat bekommt drei Intensitäts-Portionen
- **WHEN** der Seed läuft und Edamer hat Tag `breakfast-topping` mit Portionen 15g/25g/35g
- **THEN** werden Portionen "Belag knapp" (15g), "Belag normal" (25g), "Belag üppig" (35g) angelegt

### Requirement: MeasuringUnits für Portionen

Das System SHALL folgende MeasuringUnits anlegen (falls nicht vorhanden):
- `MeasuringUnit(name="Scheibe")` — für Brot-Portionen
- `MeasuringUnit(name="Portion")` — für Belag-Portionen  
- `MeasuringUnit(name="Tasse (200ml)")` — für Getränke-Portionen
- `MeasuringUnit(name="Schuss (30ml)")` — für Milch-Portionen

#### Scenario: MeasuringUnits werden idempotent angelegt
- **WHEN** der Seed mehrfach läuft
- **THEN** werden keine Duplikate erstellt (get_or_create)
