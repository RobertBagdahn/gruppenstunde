## MODIFIED Requirements

### Requirement: Benutzersuche

Das System SHALL die Suche nach Benutzern per Name oder exakter E-Mail-Adresse unterstützen, ohne E-Mail-Adressen anderer Nutzer preiszugeben.

#### Scenario: Benutzer suchen

- GIVEN authentifizierte Benutzer im System
- WHEN ein authentifizierter Benutzer per GET `/api/users/search/?q=pfadfinder` sucht (mindestens 2 Zeichen)
- THEN werden passende Benutzer paginiert mit `{ id, display_name }` zurückgegeben, ohne E-Mail-Adresse
- AND die Ergebnisse werden zum Einladen von Planer-Mitarbeitern, Essensplan- und Einkaufslisten-Mitgliedern verwendet
