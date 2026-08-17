# user-profiles Specification (Delta)

## MODIFIED Requirements

### Requirement: Benutzerprofil

Das System MUST ein UserProfile für jeden registrierten Benutzer pflegen.

#### Scenario: Eigenes Profil anzeigen (aktualisiert)

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer GET `/api/profile/me/` aufruft
- THEN werden die Profildaten zurückgegeben: `{ id, slug, scout_name, first_name, last_name, gender, birthday, about_me, nutritional_tags, profile_picture_url, is_public, created_at, updated_at }`
- AND `slug` ist der human-readable Identifier oder `null` wenn nicht gesetzt

#### Scenario: Profil aktualisieren (aktualisiert)

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer PATCH `/api/profile/me/` mit partiellen Daten absendet (optionale Felder: `scout_name`, `first_name`, `last_name`, `gender`, `birthday`, `about_me`, `nutritional_tag_ids`, `is_public`, `slug`)
- THEN wird das Profil aktualisiert
- AND der slug wird auf Validierung geprüft (Slug-Format, unique)

#### Scenario: Fremdes Profil anzeigen (aktualisiert)

- GIVEN ein beliebiger Benutzer
- WHEN GET `/api/profile/{userId}/` aufgerufen wird
- THEN wird eine öffentliche Ansicht des Benutzerprofils zurückgegeben wenn `is_public=true`: `{ id, slug, scout_name, first_name, about_me, profile_picture_url, created_at, content }`
- AND HTTP 404 wenn `is_public=false` (außer der anfragende User ist der Profilinhaber)

## ADDED Requirements

### Requirement: Slug-Validierung

Das System MUST den slug auf gültiges Format und Eindeutigkeit prüfen.

#### Scenario: Slug-Format

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer einen slug mit ungültigen Zeichen setzt (Leerzeichen, Großbuchstaben, Umlaute, Sonderzeichen)
- THEN wird HTTP 422 zurückgegeben

#### Scenario: Slug-Eindeutigkeit

- GIVEN ein existierender slug "peter" bei User A
- WHEN User B versucht slug "peter" zu setzen
- THEN wird HTTP 422 zurückgegeben

### Requirement: API-Endpunkt by-slug

Das System SHALL einen zusätzlichen API-Endpunkt zur Profil-Abfrage per slug bereitstellen.

#### Scenario: Profil per slug abrufen

- GIVEN ein User mit slug="peter"
- WHEN GET `/api/profile/by-slug/peter/` aufgerufen wird
- THEN werden die öffentlichen Profildaten zurückgegeben (wie bei GET `/api/profile/{userId}/`)
- AND HTTP 200

#### Scenario: Profil per ID-Fallback abrufen

- GIVEN ein User ohne slug (slug=null, id=42)
- WHEN GET `/api/profile/by-slug/42/` aufgerufen wird
- THEN wird das Profil des Users mit ID=42 zurückgegeben (Fallback)
- AND HTTP 200
