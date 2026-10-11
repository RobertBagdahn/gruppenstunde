## MODIFIED Requirements

### Requirement: Notiz in der Plan-Zeile und im Dialog
Die Plan-Zeile einer Einzelzutat SHALL in Tages- und Tabellenansicht eine vorhandene Notiz neben der Zutat anzeigen. Nutzer mit Bearbeitungsrecht SHALL die Notiz dort hinzufügen, ändern und löschen können. Nutzer ohne Bearbeitungsrecht SHALL die Notiz lesen, aber nicht ändern können. Der Hinzufügen-Dialog für Einzelzutaten SHALL ein optionales Notiz-Feld enthalten. Rezepteinträge können eine Notiz über die API speichern, erhalten in den Planansichten aber keine Notiz-Bedienung.

#### Scenario: Notiz in der Zeile bearbeiten
- **WHEN** der Nutzer in der Zeile die Notiz ändert und das Feld verlässt
- **THEN** wird die Notiz gespeichert und in der Zeile angezeigt

#### Scenario: Notiz nach Neuladen
- **GIVEN** ein bearbeitbarer Plan enthält eine Einzelzutat
- **WHEN** der Nutzer eine Notiz speichert und die Planseite neu lädt
- **THEN** zeigt die Zeile die gespeicherte Notiz

#### Scenario: Notiz löschen
- **GIVEN** eine Einzelzutat besitzt eine Notiz
- **WHEN** der Nutzer den Notiztext entfernt und speichert
- **THEN** ist die Notiz leer und die Zeile zeigt keinen alten Text

#### Scenario: Keine Bearbeitungsrechte
- **GIVEN** der Nutzer darf den Plan nur ansehen
- **WHEN** die Einzelzutat angezeigt wird
- **THEN** ist die Notiz lesbar und es gibt keine Bearbeitungsaktion

## ADDED Requirements

### Requirement: Notiz beim Kopieren erhalten
Beim Kopieren von MealItems in eine andere Mahlzeit und beim Duplizieren eines Essensplans SHALL die Item-Notiz unverändert übernommen werden.

#### Scenario: Notiz beim Kopieren erhalten
- **GIVEN** ein Quell-MealItem hat die Notiz „ohne Zwiebeln“
- **WHEN** das Item in eine andere Mahlzeit kopiert oder der ganze Essensplan dupliziert wird
- **THEN** enthält das kopierte MealItem die Notiz „ohne Zwiebeln“
