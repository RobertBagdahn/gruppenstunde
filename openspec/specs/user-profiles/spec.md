# user-profiles Specification

## Purpose

Benutzerprofil- und Einstellungsverwaltung für die Inspi-Plattform. Jeder Benutzer hat ein Profil mit pfadfinderspezifischen Informationen und konfigurierbaren Standard-Einstellungen für die Suchfilterung. Benutzer können außerdem Person-Datensätze für sich selbst und Familienmitglieder verwalten (werden für Event-Registrierungen verwendet).

## Requirements

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
- THEN wird eine öffentliche Ansicht des Benutzerprofils zurückgegeben wenn `is_public=true`: `{ id, scout_name, first_name, about_me, profile_picture_url, created_at, content }`
- AND HTTP 404 wenn `is_public=false` (außer der anfragende User ist der Profilinhaber)

### Requirement: Profil-Sichtbarkeit in Public-API

Die Public-Profile-API MUST das `is_public` Flag respektieren.

#### Scenario: Öffentliches Profil anzeigen wenn is_public=true

- GIVEN ein Benutzer mit `is_public = true`
- WHEN ein anderer Benutzer `GET /api/profile/{userId}/` aufruft
- THEN werden die öffentlichen Profildaten zurückgegeben

#### Scenario: Profil verbergen wenn is_public=false

- GIVEN ein Benutzer mit `is_public = false`
- WHEN ein anderer Benutzer `GET /api/profile/{userId}/` aufruft
- THEN wird HTTP 404 zurückgegeben

#### Scenario: Eigenes Profil immer sichtbar

- GIVEN ein Benutzer mit `is_public = false`
- WHEN der Benutzer selbst `GET /api/profile/{eigene-userId}/` aufruft
- THEN werden die Profildaten trotzdem zurückgegeben

### Requirement: Benutzer-Einstellungen (UserPreference)

Das System SHALL konfigurierbare Standard-Sucheinstellungen als `UserPreference` (OneToOne mit User) unterstützen.

Das `profiles.UserPreference` Model ist die einzige Quelle für Benutzer-Einstellungen.

#### Scenario: Standard-Einstellungen setzen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer Einstellungen per PATCH `/api/profile/me/preferences/` aktualisiert
- THEN werden Standardwerte gespeichert:
  - `preferred_scout_level_id` (FK zu ScoutLevel, nullable)
  - `preferred_group_size_min` (IntegerField, nullable)
  - `preferred_group_size_max` (IntegerField, nullable)
  - `preferred_difficulty` (CharField: `easy` | `medium` | `hard` | leer)
  - `preferred_location` (CharField, max 50)

#### Scenario: Einstellungen auf Suche anwenden

- GIVEN ein Benutzer mit gespeicherten Einstellungen
- WHEN der Benutzer die Suchseite ohne explizite Filter öffnet
- THEN werden die gespeicherten Einstellungen als Standard-Filterwerte voreingestellt

### Requirement: Ernährungs-Tags im Profil

Das System SHALL Benutzern die Verwaltung von Ernährungspräferenzen und -einschränkungen über NutritionalTag-Zuordnungen ermöglichen.

#### Scenario: Ernährungs-Tags setzen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer Ernährungs-Tags per `nutritional_tag_ids` in PATCH `/api/profile/me/` aktualisiert
- THEN werden die Tags mit dem UserProfile verknüpft
- AND die Tags werden beim Durchsuchen von Rezepten und bei Event-Registrierungen berücksichtigt

### Requirement: Personen-Verwaltung

Das System MUST die Verwaltung von Person-Datensätzen für Event-Registrierungen über `/api/persons/` unterstützen.

#### Scenario: Person-Datensatz erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer POST `/api/persons/` mit `{ first_name, last_name, scout_name?, email?, birthday?, gender?, nutritional_tag_ids?, address?, zip_code?, is_owner? }` erstellt
- THEN wird ein Person-Datensatz erstellt und mit dem Benutzerkonto verknüpft

#### Scenario: Eigene Person (is_owner)

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer seinen ersten Person-Datensatz mit `is_owner=true` erstellt
- THEN repräsentiert dieser den Benutzer selbst mit seinen Profildaten

#### Scenario: Familienmitglied

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer weitere Person-Datensätze erstellt (ohne `is_owner=true`)
- THEN repräsentieren diese Familienmitglieder (z.B. Kinder für Gruppenaktivitäten)
- AND jede Person kann eigene Ernährungs-Tags (`nutritional_tags`) haben

#### Scenario: Person aktualisieren

- GIVEN ein authentifizierter Benutzer mit bestehenden Personen
- WHEN der Benutzer PATCH `/api/persons/{id}/` aufruft
- THEN werden die Personendaten aktualisiert

#### Scenario: Person löschen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer DELETE `/api/persons/{id}/` aufruft
- THEN wird der Person-Datensatz entfernt

#### Scenario: Personen auflisten

- GIVEN ein authentifizierter Benutzer mit Person-Datensätzen
- WHEN der Benutzer GET `/api/persons/` aufruft
- THEN werden alle eigenen Personen zurückgegeben

#### Scenario: Person bei Registrierung verwenden

- GIVEN ein Benutzer mit Person-Datensätzen
- WHEN der Benutzer sich für ein Event registriert
- THEN wählt der Benutzer welche Personen registriert werden
- AND Personendaten werden als Participant-Datensätze geklont (Snapshot-Muster)

### Requirement: Benutzersuche

Das System SHALL die Suche nach Benutzern per Name oder E-Mail unterstützen.

#### Scenario: Benutzer suchen

- GIVEN authentifizierte Benutzer im System
- WHEN ein authentifizierter Benutzer per GET `/api/users/search/?q=pfadfinder` sucht (mindestens 2 Zeichen)
- THEN werden passende Benutzer mit `{ id, scout_display_name, email }` zurückgegeben
- AND die Ergebnisse werden zum Einladen von Planer-Mitarbeitern oder Event-Teilnehmern verwendet

### Requirement: Eigene Inhalte auflisten

Das System SHALL Benutzern das Anzeigen ihrer eigenen erstellten Inhalte ermöglichen.

#### Scenario: Eigene Inhalte auflisten

- GIVEN ein authentifizierter Benutzer, der Inhalte erstellt hat
- WHEN der Benutzer GET `/api/profile/me/content/` aufruft
- THEN werden alle vom Benutzer erstellten Inhalte zurückgegeben (einschließlich Entwürfe)
- AND die Antwort enthält `{ id, title, slug, content_type, summary, status, image_url, created_at, updated_at }` pro Item

### Requirement: Profil-Navigation

Die Profil-Navigation MUST folgende Einträge in dieser Reihenfolge enthalten:

1. Mein Bereich (`/my-dashboard`) — Icon: `space_dashboard`
2. Profil (`/profile`) — Icon: `person` — Konsolidierte Profilseite
3. Gruppen (`/profile/groups`) — Icon: `groups`
4. Personen (`/profile/persons`) — Icon: `family_restroom`
5. Datenschutz (`/profile/privacy`) — Icon: `shield`

#### Scenario: Navigation zeigt konsolidierte Einträge

- GIVEN ein authentifizierter Benutzer
- WHEN die Profil-Navigation angezeigt wird
- THEN werden genau 5 Einträge angezeigt: Mein Bereich, Profil, Gruppen, Personen, Datenschutz
- AND kein Eintrag hat ein doppeltes Label

#### Scenario: Navigation-Eintrag "Profil" ist aktiv

- GIVEN ein Benutzer auf `/profile`
- WHEN die Navigation gerendert wird
- THEN ist der Eintrag "Profil" visuell als aktiv markiert

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

### Requirement: Profilbild-Upload

Das System SHALL den Upload von Profilbildern zu Google Cloud Storage unterstützen.

#### Scenario: Profilbild hochladen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer ein Bild als Profilbild hochlädt
- THEN wird das Bild in Google Cloud Storage gespeichert
- AND die `profile_picture_url` im UserProfile wird aktualisiert
- AND erlaubte Formate sind JPEG, PNG und WebP
- AND die maximale Dateigröße beträgt 500 KB
