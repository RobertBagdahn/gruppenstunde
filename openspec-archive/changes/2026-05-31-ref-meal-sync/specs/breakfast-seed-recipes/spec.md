## ADDED Requirements

### Requirement: Frühstücks-Seed-Rezepte bereitstellen
Das System SHALL über einen Management Command einen Katalog vordefinierter Mini-Rezepte mit `recipe_type=breakfast` erstellen. Jedes Mini-Rezept besteht aus 1-3 Zutaten mit KI-geschätzten Portionsmengen für 1 Person.

#### Scenario: Seed-Command ausführen
- **WHEN** `uv run python manage.py seed_breakfast_recipes` ausgeführt wird
- **THEN** werden Mini-Rezepte erstellt (idempotent, Slug-basierte Dedup)

### Requirement: Brot-Belag-Varianten
Das System SHALL mindestens folgende Brot-Belag-Kombinationen als Mini-Rezepte bereitstellen (je 1 Scheibe Brot + 1 Portion Belag):
- Brot mit Nutella
- Brot mit Wurst
- Brot mit Käse
- Brot mit Frischkäse
- Brot mit Marmelade
- Brot mit Honig
- Brot mit Butter
- Brot mit Erdnussbutter
- Brot mit Leberwurst
- Brot mit Lachs
- Brot mit Avocado
- Brot mit Hummus

#### Scenario: Brot-Rezepte vorhanden
- **WHEN** Seed-Command gelaufen ist
- **THEN** existieren mindestens 12 Brot-Belag-Rezepte mit `recipe_type=breakfast` und je 2 RecipeItems (Brot + Belag)

### Requirement: Cerealien-Rezepte
Das System SHALL Mini-Rezepte für Cerealien bereitstellen:
- Müsli (mit Milch)
- Cornflakes (mit Milch)
- Porridge
- Overnight Oats

#### Scenario: Cerealien vorhanden
- **WHEN** Seed-Command gelaufen ist
- **THEN** existieren mindestens 4 Cerealien-Rezepte mit `recipe_type=breakfast`

### Requirement: Getränke-Rezepte
Das System SHALL Mini-Rezepte für Frühstücksgetränke bereitstellen:
- Kakao
- Milch
- Orangensaft
- Apfelsaft
- Tee
- Kaffee

#### Scenario: Getränke vorhanden
- **WHEN** Seed-Command gelaufen ist
- **THEN** existieren mindestens 6 Getränke-Rezepte mit `recipe_type=breakfast` oder als eigenständige drink-Kategorie

### Requirement: Extras-Rezepte
Das System SHALL Mini-Rezepte für Frühstücks-Extras bereitstellen:
- Joghurt
- Obst (gemischt)
- Ei gekocht
- Rührei

#### Scenario: Extras vorhanden
- **WHEN** Seed-Command gelaufen ist
- **THEN** existieren mindestens 4 Extra-Rezepte mit `recipe_type=breakfast`
