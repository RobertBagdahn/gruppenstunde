## ADDED Requirements

### Requirement: Mitarbeiter ohne E-Mail-Adresse anzeigen

Das System SHALL Mitarbeiter eines Heimabend-Planers nur mit ihrem öffentlichen Anzeigenamen ausgeben, nie mit Benutzername oder E-Mail-Adresse.

#### Scenario: Planer mit Mitarbeitern abrufen

- GIVEN ein Planer mit einem Mitarbeiter, dessen Benutzername eine E-Mail-Adresse ist
- WHEN der Owner GET `/api/planner/{id}/` aufruft
- THEN enthält jeder Mitarbeiter `display_name` statt `username`
- AND die Antwort enthält keine E-Mail-Adresse

#### Scenario: Mitarbeiter einladen

- WHEN der Owner per POST `/api/planner/{id}/invite/` einen Benutzer einlädt
- THEN nennt die Bestätigung den Benutzer mit seinem Anzeigenamen, nicht mit seiner E-Mail-Adresse
