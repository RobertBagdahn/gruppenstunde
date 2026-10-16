## ADDED Requirements

### Requirement: Manuelle Einträge löschen
Die Einkaufsliste SHALL für jeden manuell hinzugefügten Eintrag eine Löschen-Aktion anbieten. Die Aktion MUST `DELETE /api/shopping-lists/{id}/items/{item_id}/` aufrufen und einen Undo-Hinweis zeigen. Aus Rezepten oder Essensplänen erzeugte Einträge SHALL keine Löschen-Aktion haben.

#### Scenario: Manuellen Eintrag löschen
- **WHEN** der Nutzer bei „ZZ-TEST Klebeband“ (manuell hinzugefügt) auf „Eintrag löschen“ klickt
- **THEN** verschwindet der Eintrag sofort aus der Liste, ohne auf die Serverantwort oder ein Neuladen zu warten
- **AND** ein Undo-Hinweis erscheint

#### Scenario: Löschen rückgängig machen
- **GIVEN** „ZZ-TEST Klebeband“ war abgehakt und stand an vierter Stelle
- **WHEN** der Nutzer im Undo-Hinweis „Rückgängig“ wählt
- **THEN** erscheint der Eintrag wieder abgehakt an derselben Stelle

#### Scenario: Löschen schlägt fehl
- **WHEN** das Backend das Löschen ablehnt
- **THEN** erscheint der Eintrag wieder und eine deutsche Fehlermeldung nennt den Grund

#### Scenario: Quelle ist ein Rezept
- **WHEN** ein Eintrag aus einem Rezept erzeugt wurde
- **THEN** zeigt die Zeile keine Löschen-Aktion

#### Scenario: Fehlende Berechtigung
- **WHEN** der Nutzer die Liste nur ansehen darf (Rolle „viewer“)
- **THEN** wird keine Löschen-Aktion angezeigt und das Backend antwortet bei direktem Aufruf mit 403

### Requirement: Einkaufsliste in der Übersicht löschen
Die Übersicht der Einkaufslisten SHALL bei jeder Liste mit `can_delete` eine Löschen-Aktion anbieten. Der Bestätigungsdialog MUST den Namen der Liste nennen. Listen ohne `can_delete` (geteilte Listen anderer Besitzer) SHALL keine Löschen-Aktion zeigen.

#### Scenario: Eigene Liste löschen
- **WHEN** der Besitzer bei „ZZ-TEST Wocheneinkauf“ in der Übersicht „Löschen“ wählt
- **THEN** lautet der Dialogtitel „Einkaufsliste „ZZ-TEST Wocheneinkauf“ löschen?“
- **AND** nach dem Bestätigen verschwindet die Liste aus der Übersicht

#### Scenario: Geteilte Liste
- **WHEN** der Nutzer eine Liste sieht, die ihm nur geteilt wurde
- **THEN** zeigt die Karte keine Löschen-Aktion

### Requirement: Zugriffsfehler ohne Rohtexte und ohne Existenzverrat
Die Einkaufslisten-Seiten SHALL Fehler ausschließlich als deutsche Meldungen zeigen, nie als HTTP-Statustext („API error: 401 Unauthorized“). Anonyme Besucher MUST statt eines Fehlers einen Login-Hinweis mit Anmelde-Aktion erhalten. Das Backend MUST für eine fremde Einkaufsliste bei Lesen, Ändern und Löschen einheitlich 404 liefern; 403 bleibt Mitgliedern ohne das nötige Recht vorbehalten. Die 401-Meldung beim Lesen MUST vom Ansehen sprechen, nicht vom Speichern.

#### Scenario: Anonym aufgerufene Liste
- **WHEN** ein nicht angemeldeter Besucher `/shopping-lists/3` öffnet
- **THEN** erscheint „Melde dich an, um diese Einkaufsliste zu sehen.“ mit „Kostenlos anmelden“
- **AND** die API antwortet mit 401 „Bitte melde dich an, um deine Einkaufslisten zu sehen.“

#### Scenario: Fremde Liste löschen
- **WHEN** ein angemeldeter Nutzer ohne Zugriff `DELETE /api/shopping-lists/{id}/` aufruft
- **THEN** antwortet das Backend mit 404 und die Liste bleibt erhalten

#### Scenario: Fremde Liste öffnen
- **WHEN** ein angemeldeter Nutzer ohne Zugriff die Detailseite einer fremden Liste öffnet
- **THEN** zeigt die Seite „Einkaufsliste nicht gefunden“ ohne englischen Statustext
