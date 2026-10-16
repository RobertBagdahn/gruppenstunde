## ADDED Requirements

### Requirement: End-to-End-Benchmark mit echten Rezeptseiten
Das System SHALL einen automatisierten Test bereitstellen, der gespeicherte, gekürzte echte Chefkoch-Seiten durch die produktive Review-Pipeline (`preview_recipe_ingredients`) gegen einen Snapshot des Zutatenkatalogs laufen lässt. Ersetzt werden MUST nur der Netzwerkabruf und Gemini-Aufrufe; Parser, Matcher und Mengenumrechnung MUST unverändert laufen.

#### Scenario: Benchmark läuft offline
- **GIVEN** zehn gespeicherte Chefkoch-Seiten und der Katalog-Snapshot
- **WHEN** `uv run pytest recipe/tests/test_chefkoch_import_matching_e2e.py` läuft
- **THEN** wird für jede Seite eine Review-Vorschau ohne Netzwerkzugriff und ohne Gemini erzeugt

#### Scenario: Zeilenbericht
- **GIVEN** die Umgebungsvariable `CHEFKOCH_BENCHMARK_REPORT` ist gesetzt
- **WHEN** der Benchmark läuft
- **THEN** wird ein Markdown-Bericht mit Ergebnis, gewählter Zutat, Kandidaten und Menge je Zeile geschrieben

### Requirement: Gold-Labels je Zutatenzeile
Jede Zutatenzeile SHALL eine Menge akzeptierter Katalog-Zutaten, eine erwartete Grammzahl (oder keine) und eine Toleranz besitzen. Zeilen ohne passende Katalog-Zutat MUST als „neu erlaubt“ markiert sein. Kombizeilen MUST als mehrere erwartete Zeilen beschrieben sein.

#### Scenario: Salz und Pfeffer nach Belieben
- **GIVEN** die Zeile „Salz und Pfeffer“ ohne Menge
- **WHEN** sie bewertet wird
- **THEN** werden zwei Zeilen erwartet: 1 Prise `Jodsalz` und 1 Prise `gemahlener schwarzer Pfeffer`

### Requirement: Kennzahlen als Ratchet
Der Benchmark SHALL die Kennzahlen „richtige Zutat“, „still falsch gewählt“, „Kandidaten-Recall Top 5“, „Menge korrekt“ und „Zeile ohne Nacharbeit“ berechnen. Mindestwerte MUST im Test festgeschrieben sein und DÜRFEN nur angehoben werden. Nach Abschluss dieser Change MUST gelten: richtige Zutat ≥ 90 %, falsch gewählt ≤ 3 %, Menge korrekt ≥ 85 %, ohne Nacharbeit ≥ 75 %.

#### Scenario: Verschlechterung wird erkannt
- **GIVEN** eine Änderung senkt die Quote „richtige Zutat“ unter den festgeschriebenen Wert
- **WHEN** die Test-Suite läuft
- **THEN** schlägt der Benchmark mit der Zusammenfassung der Kennzahlen fehl

### Requirement: Katalog-Snapshot exportierbar
Das System SHALL einen Management-Command `export_matching_catalog` bereitstellen, der System-Zutaten (ohne Owner), Aliase, aktive Portionen und Maßeinheiten als komprimierte JSON-Datei exportiert.

#### Scenario: Snapshot aktualisieren
- **WHEN** ein Staff-Entwickler `uv run python manage.py export_matching_catalog` gegen eine Datenbank ausführt
- **THEN** wird `recipe/tests/fixtures/chefkoch_matching/catalog.json.gz` neu geschrieben und keine nutzereigene Zutat ist enthalten
