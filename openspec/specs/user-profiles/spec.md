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
- THEN werden die Profildaten zurückgegeben: `{ id, scout_name, first_name, last_name, gender, birthday, about_me, nutritional_tags, profile_picture_url, created_at, updated_at }`

#### Scenario: Profil aktualisieren

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer PATCH `/api/profile/me/` mit partiellen Daten absendet (optionale Felder: `scout_name`, `first_name`, `last_name`, `gender`, `birthday`, `about_me`, `nutritional_tag_ids`)
- THEN wird das Profil aktualisiert
- AND das Profilbild kann separat zu Google Cloud Storage hochgeladen werden

#### Scenario: Fremdes Profil anzeigen

- GIVEN ein beliebiger Benutzer
- WHEN GET `/api/profile/{userId}/` aufgerufen wird
- THEN wird eine öffentliche Ansicht des Benutzerprofils zurückgegeben: `{ id, scout_name, first_name, about_me, profile_picture_url, created_at, ideas }` (nur veröffentlichte Ideas)

### Requirement: Benutzer-Einstellungen (UserPreference)

Das System SHALL konfigurierbare Standard-Sucheinstellungen als `UserPreference` (OneToOne mit User) unterstützen.

**Hinweis: Technische Schuld** — Im Code existieren zwei separate UserPreference-Models: `profiles.UserPreference` (ohne Difficulty-Choices) und `idea.UserPreferences` (mit DifficultyChoices). Die `idea`-Version soll entfernt und `profiles.UserPreference` als einzige Quelle verwendet werden.

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

### Requirement: Eigene Ideas auflisten

Das System SHALL Benutzern das Anzeigen ihrer eigenen erstellten Ideas ermöglichen.

#### Scenario: Eigene Ideas auflisten

- GIVEN ein authentifizierter Benutzer, der Ideas erstellt hat
- WHEN der Benutzer GET `/api/profile/me/ideas/` aufruft
- THEN werden alle vom Benutzer erstellten Ideas zurückgegeben (einschließlich Entwürfe)
- AND die Antwort enthält `{ id, title, slug, idea_type, summary, status, image_url, created_at, updated_at }` pro Idea

### Requirement: Profilbild-Upload

Das System SHALL den Upload von Profilbildern zu Google Cloud Storage unterstützen.

#### Scenario: Profilbild hochladen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer ein Bild als Profilbild hochlädt
- THEN wird das Bild in Google Cloud Storage gespeichert
- AND die `profile_picture_url` im UserProfile wird aktualisiert
- AND erlaubte Formate sind JPEG, PNG und WebP
- AND die maximale Dateigröße beträgt 2 MB
