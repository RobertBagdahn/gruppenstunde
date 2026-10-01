## MODIFIED Requirements

### Requirement: Zubereitungsschritte sind in Rezeptansichten konsistent
Die Rezept-Detailansicht und der Rezept-Editor SHALL dieselbe maßgebliche Quelle für Zubereitungsschritte verwenden. Wenn bestehende Rezepte Anweisungen als Markdown-Beschreibung statt in strukturierten Schritten speichern, SHALL die Detailansicht diese Inhalte weiterhin darstellen oder der Change SHALL eine explizite, getestete Überführung in das strukturierte Format vorsehen.

#### Scenario: Schritte liegen im Markdown-Feld
- **GIVEN** ein Rezept hat keine strukturierten Steps, aber eine nicht-leere Markdown-Beschreibung mit Zubereitungsanweisungen
- **WHEN** die Rezept-Detailansicht geöffnet wird
- **THEN** SHALL die Zubereitungsanweisung sichtbar sein und nicht durch „Noch keine Schritte“ verdeckt werden

#### Scenario: Strukturierte Steps
- **GIVEN** ein Rezept besitzt strukturierte Zubereitungsschritte
- **WHEN** Detailansicht und Editor geöffnet werden
- **THEN** SHALL beide dieselben Schritte in derselben Reihenfolge darstellen

#### Scenario: Anonymer Zugriff auf öffentliches Rezept
- **GIVEN** ein öffentliches Rezept wird anonym aufgerufen
- **WHEN** dessen Detailansicht geladen wird
- **THEN** SHALL die Zubereitungsschritte gemäß den öffentlichen Rezeptberechtigungen sichtbar sein; private Entwürfe bleiben geschützt
