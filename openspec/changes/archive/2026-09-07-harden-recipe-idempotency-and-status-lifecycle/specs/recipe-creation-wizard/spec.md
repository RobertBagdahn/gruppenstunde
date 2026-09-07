## MODIFIED Requirements

### Requirement: 5-Step Wizard Struktur
Der `RecipeWizard` SHALL aus fünf aufeinanderfolgenden Steps bestehen: (0) Methoden-Wahl, (1) Zutaten, (2) Metadaten, (3) Steps, (4) Vorschau & Speichern. Jeder Step SHALL einen "Weiter"-Button haben, der die Änderungen des aktuellen Steps via API persistiert und erst nach erfolgreichem Abschluss zum nächsten Step navigiert. Ein "Zurück"-Button SHALL zum vorherigen Step navigieren. Die Fertigstellung in Step 4 SHALL den Status gemäß der Sichtbarkeit des Rezepts behandeln.

#### Scenario: Private Fertigstellung
- **WHEN** ein Nutzer im Vorschau-Step ein privates Rezept fertigstellt
- **THEN** wird kein öffentlicher Statusübergang ausgelöst
- **THEN** navigiert der Wizard nach erfolgreicher Fertigstellung zur Rezeptdetailseite

#### Scenario: Öffentliche Fertigstellung
- **WHEN** ein Nutzer im Vorschau-Step ein öffentliches Rezept fertigstellt
- **THEN** wird der Statusübergang zu `submitted` erfolgreich persistiert
- **THEN** navigiert der Wizard erst nach erfolgreicher Antwort zur Rezeptdetailseite

#### Scenario: Fertigstellung schlägt fehl
- **WHEN** die Statuspersistenz im Vorschau-Step fehlschlägt
- **THEN** bleibt der Nutzer im Vorschau-Step
- **THEN** wird eine deutsche Fehlermeldung angezeigt
