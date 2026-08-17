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

#### Scenario: Idempotenz
- **WHEN** das Command mehrfach ausgeführt wird
- **THEN** DÜRFEN keine Duplikate entstehen (`get_or_create` Pattern)
- **THEN** MÜSSEN bestehende Einträge unverändert bleiben
