## ADDED Requirements

### Requirement: Backfill von Supermarktabteilungen für Bestandszutaten

Das System SHALL ein idempotentes Management-Command `backfill_retail_sections` bereitstellen, das allen Zutaten ohne gesetzte `retail_section` über das bestehende Keyword-Mapping (`get_retail_section`) eine Abteilung zuordnet.

#### Scenario: Zutat ohne Abteilung wird zugeordnet

- **WHEN** eine Zutat "Schafskäse" ohne `retail_section` existiert und das Command ausgeführt wird
- **THEN** wird ihr die Abteilung "Milchprodukte & Käse" zugeordnet und gespeichert

#### Scenario: Wiederholter Lauf ändert nichts

- **WHEN** das Command ein zweites Mal ausgeführt wird, nachdem alle Zutaten bereits zugeordnet sind
- **THEN** werden keine weiteren Änderungen vorgenommen (idempotent)

#### Scenario: Bereits gesetzte Abteilung bleibt unangetastet

- **WHEN** eine Zutat bereits eine manuell gesetzte `retail_section` hat
- **THEN** überschreibt das Command diese nicht

#### Scenario: Dry-Run speichert nicht

- **WHEN** das Command mit `--dry-run` ausgeführt wird
- **THEN** wird die geplante Zuordnung pro Zutat ausgegeben, aber keine Änderung in der Datenbank gespeichert

#### Scenario: Zutat ohne Keyword-Treffer bleibt offen

- **WHEN** eine Zutat keinen Keyword-Treffer erzielt
- **THEN** bleibt ihre `retail_section` leer und sie erscheint in der Einkaufsliste weiterhin unter "Sonstiges"

### Requirement: Vollständige Keyword-Stammdaten für gängige Zutaten

Das Keyword-Mapping SHALL Einträge für die in Beschwerden genannten Zutaten enthalten, sodass Müsli, Pflanzenöl, Schafskäse und Tomate korrekt zugeordnet werden.

#### Scenario: Pflanzenöl wird Öle & Soßen zugeordnet

- **WHEN** das Keyword-Mapping für "Pflanzenöl" abgefragt wird
- **THEN** liefert es die Abteilung "Öle & Soßen"

#### Scenario: Müsli wird Grundnahrungsmittel zugeordnet

- **WHEN** das Keyword-Mapping für "Müsli" abgefragt wird
- **THEN** liefert es die Abteilung "Grundnahrungsmittel"

#### Scenario: Tomate (Singular) wird Gemüse zugeordnet

- **WHEN** das Keyword-Mapping für "Tomate" abgefragt wird
- **THEN** liefert es die Abteilung "Gemüse"
