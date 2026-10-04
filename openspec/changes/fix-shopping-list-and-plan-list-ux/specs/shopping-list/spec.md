## ADDED Requirements

### Requirement: Manuelle Einträge löschen
Die Einkaufsliste SHALL für jeden manuell hinzugefügten Eintrag eine Löschen-Aktion anbieten. Die Aktion MUST `DELETE /api/shopping-lists/{id}/items/{item_id}/` aufrufen und einen Undo-Hinweis zeigen. Aus Rezepten oder Essensplänen erzeugte Einträge SHALL keine Löschen-Aktion haben.

#### Scenario: Manuellen Eintrag löschen
- **WHEN** der Nutzer bei „ZZ-TEST Klebeband“ (manuell hinzugefügt) auf „Eintrag löschen“ klickt
- **THEN** verschwindet der Eintrag aus der Liste
- **AND** ein Undo-Hinweis erscheint

#### Scenario: Quelle ist ein Rezept
- **WHEN** ein Eintrag aus einem Rezept erzeugt wurde
- **THEN** zeigt die Zeile keine Löschen-Aktion

#### Scenario: Fehlende Berechtigung
- **WHEN** der Nutzer die Liste nicht bearbeiten darf
- **THEN** wird keine Löschen-Aktion angezeigt und das Backend antwortet bei direktem Aufruf mit 403
