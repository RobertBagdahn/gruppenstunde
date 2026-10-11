## ADDED Requirements

### Requirement: Einzelnotizen an Essensplan-Einträgen

Ein MealItem SHALL eine eigene Notiz mit maximal 500 Zeichen speichern können. In diesem Umfang zeigt die Food-UI Notizen für Einzelzutaten im Essensplan; Rezepteinträge können die API-Notiz ebenfalls speichern, erhalten aber noch keine Notiz-Bedienung in den Planansichten. Bearbeitende Personen SHALL Notizen für Einzelzutaten in Tages- und Tabellenansicht hinzufügen, bearbeiten und löschen können. Die Notiz SHALL neben der Zutat sichtbar sein. Nicht bearbeitende Personen SHALL vorhandene Notizen lesen, aber nicht ändern können. Beim Kopieren eines MealItems und beim Duplizieren eines Plans SHALL die Item-Notiz erhalten bleiben.

#### Scenario: Notiz hinzufügen und wieder öffnen

- **GIVEN** ein bearbeitbarer Plan enthält ein Zutaten- oder Rezept-Item
- **WHEN** der Nutzer eine Notiz speichert und die Planseite neu lädt
- **THEN** SHALL die Notiz am zugehörigen MealItem gespeichert und angezeigt werden

#### Scenario: Notiz löschen

- **GIVEN** ein MealItem besitzt eine Notiz
- **WHEN** der Nutzer den Notiztext entfernt und speichert
- **THEN** SHALL die Notiz leer gespeichert werden und kein alter Text angezeigt werden

#### Scenario: Keine Bearbeitungsrechte

- **GIVEN** der Nutzer darf den Plan nur ansehen
- **WHEN** das MealItem angezeigt wird
- **THEN** SHALL die Notiz lesbar sein und keine Bearbeitungsaktion anbieten

#### Scenario: Notiz beim Kopieren erhalten

- **GIVEN** ein Quell-MealItem hat eine Einzelnotiz
- **WHEN** das Item oder der ganze Essensplan kopiert wird
- **THEN** SHALL die kopierte MealItem-Notiz denselben Text enthalten
