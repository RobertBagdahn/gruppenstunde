## ADDED Requirements

### Requirement: Seed-Data Management Command

Das System MUSS ein Management Command bereitstellen das realistische Beispieldaten erstellt.

#### Scenario: Command ausführen
- **WHEN** `uv run python manage.py seed_data` ausgeführt wird
- **THEN** MÜSSEN mindestens 50 Basis-Zutaten mit vollständigen Nährwertdaten, Nutri-Score, Portionen und Preisen erstellt werden
- **THEN** MÜSSEN mindestens 10 realistische Pfadfinder-Rezepte erstellt werden (verschiedene `recipe_type`s: Frühstück, Warmgericht, Kaltgericht, Snack, Dessert, Getränk)
- **THEN** MUSS jedes Rezept vollständige RecipeItems mit korrekten Mengenangaben haben
- **THEN** MÜSSEN alle Rezepte auf `servings=1` (1 Normportion) normalisiert sein

#### Scenario: Idempotenz
- **WHEN** das Command mehrfach ausgeführt wird
- **THEN** DÜRFEN keine Duplikate entstehen (`get_or_create` Pattern)
- **THEN** MÜSSEN bestehende Einträge unverändert bleiben

#### Scenario: Zutaten mit vollständigen Daten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS sie folgende Felder befüllt haben: `name`, `slug`, `energy_kj`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `price_per_kg`, `nutri_score`, `nutri_class`, `status=verified`
- **THEN** MUSS mindestens eine `Portion` mit `weight_g` und `measuring_unit` zugeordnet sein

#### Scenario: Rezepte mit realistischem Pfadfinder-Kontext
- **WHEN** ein Rezept über das Seed-Command erstellt wird
- **THEN** MUSS es einen deutschen Titel, eine deutsche Zusammenfassung, deutsche Beschreibung, passende Tags und Scout Levels haben
- **THEN** MÜSSEN alle Texte korrekte Umlaute verwenden (ä, ö, ü, ß — niemals ae, oe, ue, ss)
- **THEN** MUSS `status=approved` gesetzt sein

### Requirement: Beispielrezepte Vielfalt

Die Seed-Rezepte MÜSSEN verschiedene Rezepttypen und Schwierigkeitsgrade abdecken.

#### Scenario: Rezepttyp-Abdeckung
- **WHEN** alle Seed-Rezepte erstellt sind
- **THEN** MÜSSEN mindestens 2 Frühstücksrezepte, 3 Warmgerichte, 2 Kaltgerichte, 1 Dessert, 1 Snack und 1 Getränk vorhanden sein

#### Scenario: Schwierigkeits-Abdeckung
- **WHEN** alle Seed-Rezepte erstellt sind
- **THEN** MÜSSEN Rezepte verschiedener Schwierigkeitsgrade vorhanden sein (leicht, mittel, schwer)
