## MODIFIED Requirements

### Requirement: Seed-Data Management Command

Das System MUSS ein Management Command bereitstellen das realistische Beispieldaten erstellt.

#### Scenario: Command ausführen
- **WHEN** `uv run python manage.py seed_all` ausgeführt wird
- **THEN** MÜSSEN mindestens 50 Basis-Zutaten mit vollständigen Nährwertdaten, Nutri-Score, Portionen und Preisen erstellt werden
- **THEN** MÜSSEN mindestens 10 realistische Pfadfinder-Rezepte erstellt werden (verschiedene `recipe_type`s: Frühstück, Warmgericht, Kaltgericht, Snack, Dessert, Getränk)
- **THEN** MUSS jedes Rezept vollständige RecipeItems mit korrekten Mengenangaben haben
- **THEN** MÜSSEN alle Rezepte auf `servings=1` (1 Normportion) normalisiert sein
- **THEN** MÜSSEN Breakfast-Tags (`breakfast-base`, `breakfast-topping`, `breakfast-drink`, `breakfast-warm-meal`) existieren
- **THEN** MÜSSEN 6 Base-Zutaten mit Tag `breakfast-base` existieren
- **THEN** MÜSSEN 17 Topping-Zutaten mit Tag `breakfast-topping` existieren
- **THEN** MÜSSEN 3 Drink-Rezepte mit Tag `breakfast-drink` existieren
- **THEN** MÜSSEN 6 Drink-Zutaten (Milch, Sahne, Hafermilch, Orangensaft, Apfelsaft, Kondensmilch) als `supply.Ingredient` existieren
- **THEN** MÜSSEN 5 warme Frühstücksrezepte (Rührei, Pfannkuchen, Omelett, Porridge, Gekochte Eier) mit Tag `breakfast-warm-meal` existieren

#### Scenario: Seed auf Produktion ausgeführt
- **WHEN** `uv run python manage.py seed_breakfast_catalog` auf der Produktionsdatenbank ausgeführt wird
- **THEN** MÜSSEN die 6 Basis-Zutaten (Bauernbrot, Toastbrot, Stuten, Körnerbrot, Brötchen halb/ganz) als `supply.Ingredient` mit Tag `breakfast-base` existieren
- **THEN** MÜSSEN 17 Topping-Zutaten mit Tag `breakfast-topping` existieren
- **THEN** MÜSSEN 3 Drink-Rezepte mit Tag `breakfast-drink` existieren

#### Scenario: Vorhandene Brot-Zutaten nachgetaggt
- **WHEN** `uv run python manage.py seed_breakfast_catalog --tag-existing` ausgeführt wird
- **THEN** MÜSSEN existierende generische Brot-Zutaten (z.B. Brot, Brötchen, Vollkornbrot, Toast) den Tag `breakfast-base` erhalten
- **THEN** DÜRFEN keine neuen Zutaten dupliziert werden (nur Tags werden hinzugefügt)

## ADDED Requirements

### Requirement: Export-Skript exportiert tags-M2M für Ingredient

Das Export-Skript `bin/export_prod_data.py` SHALL das `tags`-M2M-Feld für `Ingredient` exportieren, damit lokale Importe die Tag-Zuordnungen nicht verlieren.

#### Scenario: Export enthält ingredient tags
- **WHEN** `uv run python bin/export_prod_data.py` ausgeführt wird
- **THEN** SHALL die `supply_ingredient.json`-Fixtures das `tags`-Feld für jeden Ingredient-Eintrag enthalten (analog zu `Recipe`)
- **THEN** SHALL die `supply_ingredient_tags`-Junction-Table korrekt in die Fixtures exportiert werden

#### Scenario: Import stellt Tags wieder her
- **WHEN** `uv run python manage.py import_prod_data --flush` ausgeführt wird (nach korrektem Export)
- **THEN** HABEN alle Ingredients die gleichen Tags wie in der Produktion
