## MODIFIED Requirements

### Requirement: Profil-Navigation

Die Profil-Navigation MUSS einen neuen Eintrag "Meine Daten & Datenschutz" enthalten, der auf `/profile/privacy` verlinkt. Der Eintrag MUSS nach "Einstellungen" und vor dem Logout-Button platziert sein.

Die Profil-Navigation MUSS folgende Einträge in dieser Reihenfolge enthalten:
1. Name (`/profile/name`)
2. Gruppen (`/profile/groups`)
3. Personen (`/profile/persons`)
4. Einstellungen (`/profile/settings`)
5. Suchpräferenzen (`/profile`)
6. **Meine Daten & Datenschutz** (`/profile/privacy`) — NEU
7. Abmelden

#### Scenario: Navigation zeigt neuen Datenschutz-Eintrag
- **WHEN** ein authentifizierter Nutzer die Profil-Navigation öffnet
- **THEN** wird der Eintrag "Meine Daten & Datenschutz" zwischen "Suchpräferenzen" und "Abmelden" angezeigt

#### Scenario: Navigation verlinkt auf Privacy-Seite
- **WHEN** ein Nutzer auf "Meine Daten & Datenschutz" klickt
- **THEN** wird er auf `/profile/privacy` weitergeleitet

### Requirement: Privacy-Seite im Profil-Bereich

Das Profil MUSS eine neue Seite unter `/profile/privacy` enthalten mit drei Abschnitten:

1. **Datenübersicht**: Kategorisierte Auflistung aller gespeicherten Daten mit Anzahl pro Kategorie
2. **Daten exportieren**: Button "Alle meine Daten herunterladen (JSON)" mit Ladeindikator
3. **Konto löschen**: Roter Gefahrenbereich mit Beschreibung der Konsequenzen und "Konto löschen"-Button

Die Seite MUSS mobile-first gestaltet sein (ab 320px).

#### Scenario: Privacy-Seite zeigt alle drei Abschnitte
- **WHEN** ein authentifizierter Nutzer `/profile/privacy` aufruft
- **THEN** werden die Abschnitte "Datenübersicht", "Daten exportieren" und "Konto löschen" angezeigt

#### Scenario: Nicht authentifizierter Nutzer wird umgeleitet
- **WHEN** ein nicht authentifizierter Nutzer `/profile/privacy` aufruft
- **THEN** wird er auf `/login` umgeleitet
