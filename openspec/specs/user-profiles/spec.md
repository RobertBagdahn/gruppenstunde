# user-profiles Specification

## Purpose

Benutzerprofil- und Einstellungsverwaltung fuer die Inspi-Plattform. Jeder Benutzer hat ein Profil mit pfadfinderspezifischen Informationen und konfigurierbaren Standard-Einstellungen fuer die Suchfilterung. Benutzer koennen ausserdem Person-Datensaetze fuer sich selbst und Familienmitglieder verwalten (werden fuer Event-Registrierungen verwendet).

## Requirements

### Requirement: Benutzerprofil

Das System MUST ein UserProfile fuer jeden registrierten Benutzer pflegen.

#### Scenario: Automatische Erstellung bei Registrierung

- GIVEN ein neuer Benutzer schliesst die Registrierung ab
- WHEN das Benutzerkonto erstellt wird
- THEN wird automatisch ein UserProfile mit Standardwerten angelegt

#### Scenario: Eigenes Profil anzeigen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer GET `/api/profile/me/` aufruft
- THEN werden die Profildaten zurueckgegeben: `{ id, scout_name, first_name, last_name, gender, birthday, about_me, nutritional_tags, profile_picture_url, created_at, updated_at }`

#### Scenario: Profil aktualisieren

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer PATCH `/api/profile/me/` mit partiellen Daten absendet (optionale Felder: `scout_name`, `first_name`, `last_name`, `gender`, `birthday`, `about_me`, `nutritional_tag_ids`)
- THEN wird das Profil aktualisiert
- AND das Profilbild kann separat zu Google Cloud Storage hochgeladen werden

#### Scenario: Fremdes Profil anzeigen

- GIVEN ein beliebiger Benutzer
- WHEN GET `/api/profile/{userId}/` aufgerufen wird
- THEN wird eine oeffentliche Ansicht des Benutzerprofils zurueckgegeben: `{ id, scout_name, first_name, about_me, profile_picture_url, created_at, ideas }` (nur veroeffentlichte Ideas)

### Requirement: Benutzer-Einstellungen (UserPreference)

Das System SHALL konfigurierbare Standard-Sucheinstellungen als `UserPreference` (OneToOne mit User) unterstuetzen.

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
- WHEN der Benutzer die Suchseite ohne explizite Filter oeffnet
- THEN werden die gespeicherten Einstellungen als Standard-Filterwerte voreingestellt

### Requirement: Ernaehrungs-Tags im Profil

Das System SHALL Benutzern die Verwaltung von Ernaehrungspraeferenzen und -einschraenkungen ueber NutritionalTag-Zuordnungen ermoeglichen.

#### Scenario: Ernaehrungs-Tags setzen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer Ernaehrungs-Tags per `nutritional_tag_ids` in PATCH `/api/profile/me/` aktualisiert
- THEN werden die Tags mit dem UserProfile verknuepft
- AND die Tags werden beim Durchsuchen von Rezepten und bei Event-Registrierungen beruecksichtigt

### Requirement: Personen-Verwaltung

Das System MUST die Verwaltung von Person-Datensaetzen fuer Event-Registrierungen ueber `/api/persons/` unterstuetzen.

#### Scenario: Person-Datensatz erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer POST `/api/persons/` mit `{ first_name, last_name, scout_name?, email?, birthday?, gender?, nutritional_tag_ids?, address?, zip_code?, is_owner? }` erstellt
- THEN wird ein Person-Datensatz erstellt und mit dem Benutzerkonto verknuepft

#### Scenario: Eigene Person (is_owner)

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer seinen ersten Person-Datensatz mit `is_owner=true` erstellt
- THEN repraesentiert dieser den Benutzer selbst mit seinen Profildaten

#### Scenario: Familienmitglied

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer weitere Person-Datensaetze erstellt (ohne `is_owner=true`)
- THEN repraesentieren diese Familienmitglieder (z.B. Kinder fuer Gruppenaktivitaeten)
- AND jede Person kann eigene Ernaehrungs-Tags (`nutritional_tags`) haben

#### Scenario: Person aktualisieren

- GIVEN ein authentifizierter Benutzer mit bestehenden Personen
- WHEN der Benutzer PATCH `/api/persons/{id}/` aufruft
- THEN werden die Personendaten aktualisiert

#### Scenario: Person loeschen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer DELETE `/api/persons/{id}/` aufruft
- THEN wird der Person-Datensatz entfernt

#### Scenario: Personen auflisten

- GIVEN ein authentifizierter Benutzer mit Person-Datensaetzen
- WHEN der Benutzer GET `/api/persons/` aufruft
- THEN werden alle eigenen Personen zurueckgegeben

#### Scenario: Person bei Registrierung verwenden

- GIVEN ein Benutzer mit Person-Datensaetzen
- WHEN der Benutzer sich fuer ein Event registriert
- THEN waehlt der Benutzer welche Personen registriert werden
- AND Personendaten werden als Participant-Datensaetze geklont (Snapshot-Muster)

### Requirement: Benutzersuche

Das System SHALL die Suche nach Benutzern per Name oder E-Mail unterstuetzen.

#### Scenario: Benutzer suchen

- GIVEN authentifizierte Benutzer im System
- WHEN ein authentifizierter Benutzer per GET `/api/users/search/?q=pfadfinder` sucht (mindestens 2 Zeichen)
- THEN werden passende Benutzer mit `{ id, scout_display_name, email }` zurueckgegeben
- AND die Ergebnisse werden zum Einladen von Planer-Mitarbeitern oder Event-Teilnehmern verwendet

### Requirement: Eigene Ideas auflisten

Das System SHALL Benutzern das Anzeigen ihrer eigenen erstellten Ideas ermoeglichen.

#### Scenario: Eigene Ideas auflisten

- GIVEN ein authentifizierter Benutzer, der Ideas erstellt hat
- WHEN der Benutzer GET `/api/profile/me/ideas/` aufruft
- THEN werden alle vom Benutzer erstellten Ideas zurueckgegeben (einschliesslich Entwuerfe)
- AND die Antwort enthaelt `{ id, title, slug, idea_type, summary, status, image_url, created_at, updated_at }` pro Idea

### Requirement: Profilbild-Upload

Das System SHALL den Upload von Profilbildern zu Google Cloud Storage unterstuetzen.

#### Scenario: Profilbild hochladen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer ein Bild als Profilbild hochlaedt
- THEN wird das Bild in Google Cloud Storage gespeichert
- AND die `profile_picture_url` im UserProfile wird aktualisiert
- AND erlaubte Formate sind JPEG, PNG und WebP
- AND die maximale Dateigroesse betraegt 2 MB
