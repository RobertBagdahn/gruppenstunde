# Meal Plan Group Members

## MODIFIED Requirements

### Requirement: Stufen-Schnellhinzufügen
Der Dialog für das Stufen-Schnellhinzufügen SHALL die Anzahl als editierbaren Rohtext erhalten, bis eine gültige Ganzzahl vorliegt. Ein leerer oder ungültiger Zwischenstand MUST NOT während des Tippens sofort durch `1` ersetzt werden. Nur Ganzzahlen von 1 bis 50 SHALL bestätigbar sein; solange ein Zwischenstand ungültig ist, SHALL die Bestätigungsaktion deaktiviert bleiben.

#### Scenario: Führende Ziffer einer Anzahl bearbeiten
- **GIVEN** der Nutzer hat im Anzahl-Feld `10` eingegeben
- **WHEN** er die führende `1` entfernt
- **THEN** bleibt der neue Zwischenstand `0` im Feld sichtbar
- **AND** die Bestätigungsaktion bleibt deaktiviert, bis eine gültige Anzahl eingegeben wurde

#### Scenario: Gültige Anzahl bestätigen
- **GIVEN** der Nutzer hat eine Stufe ausgewählt
- **WHEN** er die gültige Anzahl `5` eingibt und bestätigt
- **THEN** wird der Bulk-Create-Callback mit `count: 5` aufgerufen
