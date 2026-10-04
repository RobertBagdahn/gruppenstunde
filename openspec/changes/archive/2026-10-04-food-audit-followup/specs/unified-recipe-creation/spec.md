## ADDED Requirements

### Requirement: Rezept-Basisdaten werden im Wizard einmal erfasst
Der Rezept-Wizard SHALL Titel und Rezepttyp nach erfolgreicher Erfassung nicht erneut als verpflichtende Eingaben abfragen. Validierungsfehler SHALL am jeweils betroffenen Feld in deutscher Sprache angezeigt werden; ein Toast MAY ergänzend erscheinen, SHALL aber die Feldmeldung nicht ersetzen.

#### Scenario: Titel und Typ nicht erneut erfassen
- **GIVEN** der Nutzer hat Titel und Typ in einem vorherigen Wizard-Schritt gespeichert
- **WHEN** er einen späteren Schritt erreicht
- **THEN** SHALL der Wizard diese Werte weiterverwenden, statt sie erneut abzufragen

#### Scenario: Validierung am Feld
- **GIVEN** ein erforderliches Feld ist ungültig
- **WHEN** der Nutzer zum nächsten Schritt wechselt oder speichert
- **THEN** SHALL eine verständliche deutsche Fehlermeldung am betroffenen Feld erscheinen und der Fokus SHALL auf das erste ungültige Feld gesetzt werden

#### Scenario: Anonymer Zugriff
- **GIVEN** ein nicht authentifizierter Nutzer
- **WHEN** er den geschützten Rezept-Wizard aufruft oder einen Entwurf speichern will
- **THEN** SHALL die bestehende Authentifizierung greifen und kein Entwurf ohne Berechtigung gespeichert werden
