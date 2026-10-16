# Meal Plan Group Members

## MODIFIED Requirements

### Requirement: Stufen-Schnellhinzufügen
Das System SHALL einen Endpunkt `POST /api/meal-plans/{meal_plan_id}/group-members/bulk/` bereitstellen, der mehrere GroupMembers mit gleichem Default-Alter auf einmal anlegt.

Der Dialog für das Stufen-Schnellhinzufügen SHALL die Anzahl als editierbaren Rohtext erhalten, bis eine gültige Ganzzahl vorliegt. Ein leerer oder ungültiger Zwischenstand MUST NOT während des Tippens sofort durch `1` ersetzt werden. Nur Ganzzahlen von 1 bis 50 SHALL bestätigbar sein; solange ein Zwischenstand ungültig ist, SHALL die Bestätigungsaktion deaktiviert bleiben.

#### Scenario: 5 Wölflinge auf einmal hinzufügen
- **WHEN** der Nutzer POST `/api/meal-plans/{id}/group-members/bulk/` mit `{"count": 5, "default_age": 8, "gender": "no_answer"}` sendet
- **THEN** SHALL 5 GroupMembers mit age=8 und gender="no_answer" erstellt werden
- **AND** die Response SHALL eine Liste der erstellten GroupMembers zurückgeben
- **AND** `meal_plan.norm_portions` SHALL einmalig (nach allen Inserts) neu berechnet werden

#### Scenario: Default-Alter pro Stufe
- **WHEN** der Nutzer Bulk mit `{"stufe": "woelflinge"}` sendet
- **THEN** SHALL das System automatisch `default_age=8` verwenden
- **AND** die unterstützten Stufen SHALL sein: `woelflinge` (8), `jungpfadfinder` (11), `pfadfinder` (14), `rover` (18)

#### Scenario: Führende Ziffer einer Anzahl bearbeiten
- **GIVEN** der Nutzer hat im Anzahl-Feld `10` eingegeben
- **WHEN** er die führende `1` entfernt
- **THEN** bleibt der neue Zwischenstand `0` im Feld sichtbar
- **AND** die Bestätigungsaktion bleibt deaktiviert, bis eine gültige Anzahl eingegeben wurde

#### Scenario: Gültige Anzahl bestätigen
- **GIVEN** der Nutzer hat eine Stufe ausgewählt
- **WHEN** er die gültige Anzahl `5` eingibt und bestätigt
- **THEN** wird der Bulk-Create-Callback mit `count: 5` aufgerufen
