### Requirement: Gemini befüllt Rezept-Metafelder beim URL-Import

Der Enhanced-Import SHALL beim Gemini-Call zusätzlich zu den Zutaten folgende Rezept-Metafelder extrahieren und im Response zurückgeben: `summary`, `recipe_type`, `difficulty`, `execution_time`, `preparation_time`, `costs_rating`, `scout_level_ids`, `tag_ids`.

#### Scenario: Alle Meta-Felder werden aus Rezepttext geschätzt
- **WHEN** ein Rezept per URL importiert wird
- **THEN** das System SHALL summary (1-2 Sätze), recipe_type, difficulty, execution_time, preparation_time und costs_rating im Draft-Response enthalten

#### Scenario: Scout-Levels werden aus DB-Liste gewählt
- **WHEN** der Gemini-Prompt ausgeführt wird
- **THEN** SHALL das System die verfügbaren ScoutLevels (id + name) aus der DB laden und im Prompt mitgeben
- **THEN** Gemini SHALL passende IDs aus dieser Liste auswählen

#### Scenario: Tags werden aus DB-Liste gewählt
- **WHEN** der Gemini-Prompt ausgeführt wird
- **THEN** SHALL das System die verfügbaren Tags (id + name) aus der DB laden und im Prompt mitgeben
- **THEN** Gemini SHALL passende IDs aus dieser Liste auswählen

### Requirement: Chefkoch-Zeiten haben Vorrang vor Gemini-Schätzung

Wenn die Quell-URL strukturierte Zeitangaben enthält (JSON-LD `prepTime`/`cookTime`), SHALL das System diese direkt in die Choice-Buckets mappen statt Gemini schätzen zu lassen.

#### Scenario: JSON-LD prepTime vorhanden
- **WHEN** die Quelle `prepTime: "PT20M"` im JSON-LD enthält
- **THEN** SHALL `preparation_time` auf `"less_15"` oder `"15_30"` gemappt werden (basierend auf Minutenwert)
- **THEN** Geminis preparation_time-Schätzung SHALL ignoriert werden

#### Scenario: Keine strukturierten Zeiten vorhanden
- **WHEN** die Quelle keine `prepTime`/`cookTime` im JSON-LD enthält
- **THEN** SHALL Geminis Schätzung für execution_time und preparation_time verwendet werden

### Requirement: Frontend übernimmt Meta-Felder in Formular

Das Frontend SHALL die vom Import zurückgegebenen Meta-Felder automatisch in das Rezept-Formular übernehmen.

#### Scenario: Alle Felder vorausgefüllt nach Import
- **WHEN** der Import erfolgreich zurückkehrt
- **THEN** SHALL das Formular summary, recipe_type, difficulty, execution_time, preparation_time, costs_rating, scout_levels und tags vorausgefüllt anzeigen

#### Scenario: User kann vorausgefüllte Felder editieren
- **WHEN** Felder vom Import vorausgefüllt sind
- **THEN** SHALL der User alle Felder vor dem Speichern ändern können
