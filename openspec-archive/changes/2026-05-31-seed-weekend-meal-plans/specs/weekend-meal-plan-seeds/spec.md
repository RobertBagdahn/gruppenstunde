## ADDED Requirements

### Requirement: Neue Zutaten für Wochenend-Rezepte

Das System muss 3 zusätzliche Zutaten im Seed bereitstellen: Paprikapulver, Kreuzkümmel, Chilipulver.

#### Scenario: Seed erzeugt neue Gewürze
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existieren die Zutaten Paprikapulver, Kreuzkümmel, Chilipulver mit korrekten Nährwerten, Preisen und NutritionalTags

### Requirement: 5 neue Rezepte

Das System muss 5 neue Rezepte im Seed bereitstellen: Gulasch, Chili con Carne, Porridge, Brotzeit, Grillwürstchen.

#### Scenario: Seed erzeugt neue Rezepte mit RecipeItems
- **WHEN** `seed_all --only recipes` ausgeführt wird
- **THEN** existieren alle 5 Rezepte mit status=approved, korrektem recipe_type, servings=1 und vollständigen RecipeItems (Zutaten + Mengen pro Normportion)

### Requirement: 10 Wochenend-MealPlans

Das System muss 10 MealPlans für typische Pfadfinder-Wochenenden erzeugen (Fr Abend → So Mittag).

#### Scenario: MealPlans mit korrekter Zeitstruktur
- **WHEN** `seed_all --only planner` ausgeführt wird
- **THEN** existieren 10 MealPlans mit start_datetime (Freitag) und end_datetime (Sonntag), jeweils mit 7 Mahlzeiten (Fr: Dinner; Sa: Breakfast, Lunch, Snack, Dinner; So: Breakfast, Lunch)

#### Scenario: Jede Mahlzeit hat ein Rezept
- **WHEN** ein Wochenend-MealPlan erstellt wird
- **THEN** hat jede Meal genau ein MealItem mit einem konkreten Rezept und factor=1.0

#### Scenario: Obstsalat als fester Snack
- **WHEN** ein Wochenend-MealPlan erstellt wird
- **THEN** ist der Samstag-Snack immer das Rezept "Obstsalat"

#### Scenario: Idempotenz
- **WHEN** `seed_all` mehrfach ausgeführt wird
- **THEN** werden keine doppelten MealPlans erzeugt (Check via name)

### Requirement: Prod-Deployment

Die Seeds müssen auf der Produktions-Datenbank via cloud-sql-proxy ausführbar sein.

#### Scenario: Seed auf Prod
- **WHEN** cloud-sql-proxy läuft und DATABASE_URL auf localhost zeigt
- **THEN** kann `uv run python manage.py seed_all --only recipes` und `uv run python manage.py seed_all --only planner` erfolgreich ausgeführt werden
