## ADDED Requirements

### Requirement: URL-Import stabil auf Production

Der Rezept-URL-Import (z.B. von Chefkoch) SHALL auf der Production-Umgebung stabil funktionieren. Fehler SHALL dem Nutzer klar kommuniziert werden.

#### Scenario: URL-Import schlägt fehl

- **WHEN** der URL-Import auf Production einen Fehler wirft
- **THEN** wird dem Nutzer angezeigt: „Import fehlgeschlagen — bitte URL prüfen oder Rezept manuell anlegen"
- **THEN** wird kein leerer weißer Screen angezeigt

#### Scenario: URL-Import erfolgreich auf Production

- **WHEN** der Nutzer eine gültige Rezept-URL eingibt
- **THEN** funktioniert der Import auf Production identisch wie lokal

#### Scenario: Fehlerdiagnose

- **WHEN** der URL-Import auf Production fehlschlägt
- **THEN** wird der Fehler in Sentry geloggt mit der verwendeten URL (anonymisiert falls nötig)
