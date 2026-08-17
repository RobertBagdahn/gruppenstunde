## MODIFIED Requirements

### Requirement: Profil-Navigation

Die Profil-Navigation MUST folgende Einträge in dieser Reihenfolge enthalten:

1. Mein Bereich (`/my-dashboard`) — Icon: `space_dashboard`
2. Profil (`/profile`) — Icon: `person` — Konsolidierte Profilseite
3. Gruppen (`/profile/groups`) — Icon: `groups`
4. Personen (`/profile/persons`) — Icon: `family_restroom`
5. Datenschutz (`/profile/privacy`) — Icon: `shield`

Die folgenden Navigationseinträge werden entfernt:
- Name (`/profile/name`) — In Profilseite integriert
- Einstellungen (`/profile/settings`) — In Profilseite integriert
- Zweiter "Einstellungen"-Eintrag (`/profile`) — Durch "Profil" ersetzt

#### Scenario: Navigation zeigt konsolidierte Einträge

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** die Profil-Navigation angezeigt wird
- **THEN** werden genau 5 Einträge angezeigt: Mein Bereich, Profil, Gruppen, Personen, Datenschutz
- **AND** kein Eintrag hat ein doppeltes Label

#### Scenario: Navigation-Eintrag "Profil" ist aktiv

- **GIVEN** ein Benutzer auf `/profile`
- **WHEN** die Navigation gerendert wird
- **THEN** ist der Eintrag "Profil" visuell als aktiv markiert

### Requirement: Profil-Sichtbarkeit in Public-API

Die Public-Profile-API MUST das `is_public` Flag respektieren.

#### Scenario: Öffentliches Profil anzeigen wenn is_public=true

- **GIVEN** ein Benutzer mit `is_public = true`
- **WHEN** ein anderer Benutzer `GET /api/profile/{userId}/` aufruft
- **THEN** werden die öffentlichen Profildaten zurückgegeben

#### Scenario: Profil verbergen wenn is_public=false

- **GIVEN** ein Benutzer mit `is_public = false`
- **WHEN** ein anderer Benutzer `GET /api/profile/{userId}/` aufruft
- **THEN** wird HTTP 404 zurückgegeben

#### Scenario: Eigenes Profil immer sichtbar

- **GIVEN** ein Benutzer mit `is_public = false`
- **WHEN** der Benutzer selbst `GET /api/profile/{eigene-userId}/` aufruft
- **THEN** werden die Profildaten trotzdem zurückgegeben

### Requirement: Benutzerprofil

Das System MUST ein UserProfile für jeden registrierten Benutzer pflegen.

#### Scenario: Automatische Erstellung bei Registrierung

- GIVEN ein neuer Benutzer schließt die Registrierung ab
- WHEN das Benutzerkonto erstellt wird
- THEN wird automatisch ein UserProfile mit Standardwerten angelegt

#### Scenario: Eigenes Profil anzeigen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer GET `/api/profile/me/` aufruft
- THEN werden die Profildaten zurückgegeben: `{ id, scout_name, first_name, last_name, gender, birthday, about_me, nutritional_tags, profile_picture_url, is_public, created_at, updated_at }`

#### Scenario: Profil aktualisieren

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer PATCH `/api/profile/me/` mit partiellen Daten absendet (optionale Felder: `scout_name`, `first_name`, `last_name`, `gender`, `birthday`, `about_me`, `nutritional_tag_ids`, `is_public`)
- THEN wird das Profil aktualisiert

#### Scenario: Fremdes Profil anzeigen

- GIVEN ein beliebiger Benutzer
- WHEN GET `/api/profile/{userId}/` aufgerufen wird
- THEN wird eine öffentliche Ansicht des Benutzerprofils zurückgegeben wenn `is_public=true`: `{ id, scout_name, first_name, about_me, profile_picture_url, created_at, ideas }`
- AND HTTP 404 wenn `is_public=false` (außer der anfragende User ist der Profilinhaber)

## REMOVED Requirements

### Requirement: Separate Name-Bearbeitungsseite

**Reason**: Die Name-Bearbeitung ist in die konsolidierte Profilseite unter `/profile` integriert. Die separate NamePage verwendete außerdem den falschen API-Endpoint (`/api/users/{id}/` statt `/api/profile/me/`).

**Migration**: Name-Bearbeitung erfolgt über die Profildaten-Sektion auf `/profile`. Route `/profile/name` leitet auf `/profile` um.

### Requirement: Separate Einstellungsseite

**Reason**: Alle Einstellungen (Scout-Name, Geschlecht, Geburtstag, Über mich) sind in die konsolidierte Profilseite integriert.

**Migration**: Route `/profile/settings` leitet auf `/profile` um.
