# seed-data Specification (Delta)

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
- **THEN** MÜSSEN 30 standardisierte NutritionalTag-Einträge mit konsistenter name/name_opposite-Semantik existieren (siehe `nutritional-tag-seed-standardization`)

#### Scenario: Idempotenz
- **WHEN** das Command mehrfach ausgeführt wird
- **THEN** DÜRFEN keine Duplikate entstehen (`get_or_create` Pattern)
- **THEN** MÜSSEN bestehende Einträge unverändert bleiben

#### Scenario: Zutaten mit vollständigen Daten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS sie folgende Felder befüllt haben: `name`, `slug`, `energy_kcal`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `price_per_kg`, `nutri_score`, `nutri_class`, `status=verified`
- **THEN** MUSS mindestens eine `Portion` mit `weight_g` und `measuring_unit` zugeordnet sein

#### Scenario: Rezepte mit realistischem Pfadfinder-Kontext
- **WHEN** ein Rezept über das Seed-Command erstellt wird
- **THEN** MUSS es einen deutschen Titel, eine deutsche Zusammenfassung, deutsche Beschreibung, passende Tags und Scout Levels haben
- **THEN** MÜSSEN alle Texte korrekte Umlaute verwenden (ä, ö, ü, ß — niemals ae, oe, ue, ss)
- **THEN** MUSS `status=approved` gesetzt sein

#### Scenario: Seed auf Produktion ausgeführt
- **WHEN** `uv run python manage.py seed_breakfast_catalog` auf der Produktionsdatenbank ausgeführt wird
- **THEN** MÜSSEN die 6 Basis-Zutaten (Bauernbrot, Toastbrot, Stuten, Körnerbrot, Brötchen halb/ganz) als `supply.Ingredient` mit Tag `breakfast-base` existieren
- **THEN** MÜSSEN 17 Topping-Zutaten mit Tag `breakfast-topping` existieren
- **THEN** MÜSSEN 3 Drink-Rezepte mit Tag `breakfast-drink` existieren

#### Scenario: Vorhandene Brot-Zutaten nachgetaggt
- **WHEN** `uv run python manage.py seed_breakfast_catalog --tag-existing` ausgeführt wird
- **THEN** MÜSSEN existierende generische Brot-Zutaten (z.B. Brot, Brötchen, Vollkornbrot, Toast) den Tag `breakfast-base` erhalten
- **THEN** DÜRFEN keine neuen Zutaten dupliziert werden (nur Tags werden hinzugefügt)

### Requirement: NutritionalTag fixtures are standardized

Die NutritionalTag-Fixtures in `backend/data/masterdata/supply_nutritionaltag.json` MÜSSEN die standardisierte name/name_opposite-Semantik aus `nutritional-tag-seed-standardization` verwenden.

#### Scenario: Fixture-Datei enthält neue Semantik
- **WHEN** die Fixture-Datei `supply_nutritionaltag.json` eingelesen wird
- **THEN** MUSS jedes `name`-Feld ein menschliches Merkmal beschreiben (z.B. "Vegan", "Eiallergie", "Glutenunverträglichkeit (Zöliakie)")
- **THEN** MUSS jedes `name_opposite`-Feld einen konkreten Inhaltsstoff beschreiben (z.B. "Tierische Produkte", "Ei und Eierzeugnisse", "Gluten")
- **THEN** DÜRFEN keine Einträge mit `name="Halal"` oder `name="Koscher"` existieren
- **THEN** MUSS es genau einen Eintrag mit `name="Nussallergie"` geben (keine separaten Einträge für "nussfrei" und "Schalenfrüchte")
- **THEN** MÜSSEN Einträge für "Milchallergie" und "Schalentierallergie" existieren

#### Scenario: Import via import_prod_data funktioniert
- **WHEN** `uv run python manage.py import_prod_data --only food` ausgeführt wird
- **THEN** MÜSSEN die NutritionalTags mit den neuen Namen importiert werden
- **THEN** DÜRFEN keine Fehler wegen ungültiger Daten auftreten

#### Scenario: Import via import_legacy_food funktioniert
- **WHEN** `uv run python manage.py import_legacy_food` ausgeführt wird
- **THEN** MÜSSEN bestehende NutritionalTags per `get_or_create(name=...)` aktualisiert oder neu erstellt werden
- **THEN** DÜRFEN keine Duplikate entstehen
