# public-user-profile Specification

## Purpose

Ermöglicht das Anzeigen öffentlicher Benutzerprofile im Food Frontend unter einer human-readable URL (`/profile/name/{slug}`). Zeigt Profil-Informationen sowie öffentliche Rezepte, Einkaufslisten und Essenspläne des Users an.

## Requirements

### Requirement: Profil-Seite im Food Frontend

Das Food Frontend SHALL eine öffentliche Profil-Seite unter `/profile/name/:slug` bereitstellen.

#### Scenario: Profil-Seite aufrufen (mit slug)

- GIVEN ein User mit `slug="peter"`
- WHEN ein anderer User `/profile/name/peter` aufruft
- THEN wird die öffentliche Profil-Seite angezeigt
- AND die URL in der Adresszeile ist `/profile/name/peter`

#### Scenario: Profil-Seite aufrufen (ohne slug, Fallback auf ID)

- GIVEN ein User ohne slug (slug=null)
- WHEN ein anderer User `/profile/name/42` aufruft
- THEN wird die öffentliche Profil-Seite für User-ID 42 angezeigt
- AND die URL in der Adresszeile bleibt `/profile/name/42`

#### Scenario: Profil nicht gefunden

- WHEN `/profile/name/unbekannter-slug` aufgerufen wird
- THEN wird eine 404-Seite angezeigt mit dem Titel "Profil nicht gefunden"

### Requirement: Slug-Feld auf UserProfile

Das UserProfile-Modell SHALL ein optionales `slug`-Feld als human-readable Identifier enthalten.

#### Scenario: Slug setzen

- GIVEN ein authentifizierter User
- WHEN der User PATCH `/api/profile/me/` mit `{ "slug": "peter-mueller" }` aufruft
- THEN wird der slug im UserProfile gespeichert

#### Scenario: Slug muss unique sein

- GIVEN ein User mit slug="peter"
- WHEN ein anderer User versucht, slug="peter" zu setzen
- THEN wird HTTP 422 zurückgegeben mit Fehlermeldung "Dieser Slug ist bereits vergeben"

#### Scenario: Slug muss gültiges Format haben

- GIVEN ein authentifizierter User
- WHEN der User slug mit ungültigen Zeichen (z.B. Leerzeichen, Umlaute, Großbuchstaben) setzen will
- THEN wird HTTP 422 zurückgegeben

#### Scenario: Slug löschen

- GIVEN ein authentifizierter User mit gesetztem slug
- WHEN der User PATCH `/api/profile/me/` mit `{ "slug": "" }` aufruft
- THEN wird slug auf null gesetzt
- AND die Profil-URL fällt zurück auf die numerische ID

### Requirement: API-Endpunkt by-slug

Das Backend SHALL einen API-Endpunkt `GET /api/profile/by-slug/{slug}/` bereitstellen, der ein öffentliches Profil mit Rezepten, Einkaufslisten und Essensplänen zurückgibt.

#### Scenario: Profil per slug abrufen

- GIVEN ein User mit slug="peter" und öffentlichen Inhalten
- WHEN GET `/api/profile/by-slug/peter/` aufgerufen wird
- THEN werden Profil-Informationen + öffentliche Rezepte + Einkaufslisten + Essenspläne zurückgegeben
- AND HTTP 200

#### Scenario: Profil per ID-Fallback abrufen

- GIVEN ein User ohne slug (slug=null, id=42)
- WHEN GET `/api/profile/by-slug/42/` aufgerufen wird
- THEN wird das Profil des Users mit ID=42 zurückgegeben
- AND HTTP 200

#### Scenario: is_public wird respektiert

- GIVEN ein User mit `is_public=false`
- WHEN ein anderer User `/api/profile/by-slug/{slug}/` aufruft
- THEN wird HTTP 404 zurückgegeben
- AND die Antwort enthält keinen Hinweis auf die Existenz des Users

#### Scenario: Eigenes Profil auch bei is_public=false sichtbar

- GIVEN ein authentifizierter User mit `is_public=false`
- WHEN der User selbst `/api/profile/by-slug/{eigener-slug}/` aufruft
- THEN werden die Profildaten zurückgegeben (HTTP 200)

#### Scenario: Nicht-existenter slug

- WHEN GET `/api/profile/by-slug/unbekannt/` aufgerufen wird
- THEN wird HTTP 404 zurückgegeben

### Requirement: Rezepte im Profil anzeigen

Das öffentliche Profil SHALL alle öffentlichen Rezepte des Users anzeigen.

#### Scenario: Öffentliche Rezepte werden angezeigt

- GIVEN ein User mit 3 öffentlichen Rezepten
- WHEN das öffentliche Profil aufgerufen wird
- THEN werden alle 3 Rezepte in der Sektion "Rezepte" angezeigt
- AND jedes Rezept zeigt: Titel, Bild, Erstellungsdatum

#### Scenario: Private Rezepte werden nicht angezeigt

- GIVEN ein User mit öffentlichen und privaten Rezepten
- WHEN das öffentliche Profil eines anderen Users aufgerufen wird
- THEN werden nur die öffentlichen Rezepte angezeigt
- AND private Rezepte sind nicht sichtbar

### Requirement: Einkaufslisten im Profil anzeigen

Das öffentliche Profil SHALL alle Einkaufslisten des Users anzeigen (deren owner er ist).

#### Scenario: Einkaufslisten werden angezeigt

- GIVEN ein User mit 2 Einkaufslisten
- WHEN das öffentliche Profil aufgerufen wird
- THEN werden beide Einkaufslisten in der Sektion "Einkaufslisten" angezeigt
- AND jede Liste zeigt: Name, Anzahl Items, Erstellungsdatum

### Requirement: Essenspläne im Profil anzeigen

Das öffentliche Profil SHALL alle Essenspläne des Users anzeigen (die er erstellt hat).

#### Scenario: Essenspläne werden angezeigt

- GIVEN ein User mit 2 Essensplänen
- WHEN das öffentliche Profil aufgerufen wird
- THEN werden beide Essenspläne in der Sektion "Essenspläne" angezeigt
- AND jeder Plan zeigt: Name, Erstellungsdatum

### Requirement: entityUrls verwendet slug statt id

Der entityUrls-Generator im Food Frontend SHALL für User-Links den slug statt der numerischen ID verwenden.

#### Scenario: Link zu User-Profil mit slug

- GIVEN ein User mit slug="peter"
- WHEN `getEntityUrl('user', { slug: 'peter' })` aufgerufen wird
- THEN wird `/profile/name/peter` zurückgegeben

#### Scenario: Link zu User-Profil ohne slug (Fallback)

- GIVEN ein User ohne slug (id=42)
- WHEN `getEntityUrl('user', { id: 42 })` aufgerufen wird
- THEN wird `/profile/name/42` zurückgegeben
