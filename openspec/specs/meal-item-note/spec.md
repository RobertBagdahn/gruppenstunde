# meal-item-note Specification

## Purpose
TBD - created by archiving change unified-ingredient-amount-display. Update Purpose after archive.
## Requirements
### Requirement: MealItem hat eine optionale Notiz
Das System SHALL `MealItem.note` als optionalen Freitext (leer erlaubt, maximal 500 Zeichen) speichern. Pydantic-Schema (`MealItemOut`, `MealItemCreateIn`, `MealItemUpdateIn`) und Zod-Schema MÜSSEN das Feld führen.

#### Scenario: Notiz beim Hinzufügen
- **WHEN** eine Einzelzutat mit `note="ohne Zwiebeln"` hinzugefügt wird
- **THEN** liefert die API `note="ohne Zwiebeln"` für den Eintrag

#### Scenario: Notiz ändern und löschen
- **WHEN** `PATCH /{meal_plan_id}/meal-items/{item_id}/` mit `{"note": ""}` gesendet wird
- **THEN** ist die Notiz des Eintrags leer

#### Scenario: Zu lange Notiz
- **WHEN** `note` länger als 500 Zeichen ist
- **THEN** antwortet das System mit HTTP 422

#### Scenario: Eintrag ohne Notiz
- **WHEN** ein Eintrag keine Notiz hat
- **THEN** liefert die API `note=""` und die UI zeigt keine Notizzeile

### Requirement: Notiz in der Plan-Zeile und im Dialog
Die Plan-Zeile einer Einzelzutat SHALL eine vorhandene Notiz anzeigen und für Nutzer mit Bearbeitungsrecht änderbar machen. Der Hinzufügen-Dialog für Einzelzutaten SHALL ein optionales Notiz-Feld enthalten.

#### Scenario: Notiz in der Zeile bearbeiten
- **WHEN** der Nutzer in der Zeile die Notiz ändert und das Feld verlässt
- **THEN** wird die Notiz gespeichert und in der Zeile angezeigt

### Requirement: Notiz im PDF-Export
Der PDF-Export des Essensplans SHALL die Notiz einer Einzelzutat neben der Zutat ausgeben, wenn eine vorhanden ist.

#### Scenario: Notiz im PDF
- **WHEN** ein Plan-Eintrag eine Notiz hat und der Plan als PDF exportiert wird
- **THEN** enthält das PDF die Notiz bei diesem Eintrag
