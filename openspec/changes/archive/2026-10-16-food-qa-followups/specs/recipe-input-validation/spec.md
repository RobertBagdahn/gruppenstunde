## ADDED Requirements

### Requirement: Rezepttitel werden normalisiert und geprüft
Das System SHALL Rezepttitel bei Anlage und Änderung von umgebendem Leerraum befreien und MUST einen Titel ablehnen, der nach dem Trimmen leer ist. Fehler MUST als feldbezogener 422 mit deutscher Meldung zurückgegeben werden.

#### Scenario: Titel nur aus Leerzeichen
- **WHEN** ein Rezept mit dem Titel `"   "` angelegt wird
- **THEN** antwortet das System mit HTTP 422 und `fields` enthält `title`
- **AND** es wird kein Rezept angelegt

#### Scenario: Titel mit Randleerraum
- **WHEN** ein Rezept mit dem Titel `"  Linsensuppe "` angelegt wird
- **THEN** wird der Titel als `Linsensuppe` gespeichert
