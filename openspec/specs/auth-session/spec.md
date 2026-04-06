# auth-session Specification

## Purpose

Session-basierte Authentifizierung und Benutzerverwaltung fuer die Inspi-Plattform. Verwendet Django Allauth mit HTTP-only Session-Cookies — ausdruecklich kein JWT. Umfasst Login, Registrierung, Logout, Session-Validierung und CSRF-Schutz fuer das React-SPA-Frontend.

## Requirements

### Requirement: Session-basierte Authentifizierung

Das System MUST Django-Session-Authentifizierung mit HTTP-only Cookies verwenden. JWT-Token SHALL NOT verwendet werden.

#### Scenario: Erfolgreicher Login

- GIVEN ein Benutzer mit gueltigen Zugangsdaten
- WHEN der Benutzer POST `/api/auth/login/` mit E-Mail und Passwort absendet
- THEN wird ein Session-Cookie gesetzt (HTTP-only, Secure in Produktion)
- AND die Benutzerdaten werden zurueckgegeben: `{ id, email, first_name, last_name, is_staff }`
- AND das CSRF-Token wird erneuert

#### Scenario: Ungueltiger Login

- GIVEN ungueltige Zugangsdaten
- WHEN der Benutzer POST `/api/auth/login/` absendet
- THEN wird HTTP 401 mit einer Fehlermeldung zurueckgegeben
- AND keine Session wird erstellt

#### Scenario: Login mit nicht-existierendem Konto

- GIVEN eine E-Mail-Adresse ohne zugehoeriges Konto
- WHEN der Benutzer POST `/api/auth/login/` absendet
- THEN wird HTTP 401 zurueckgegeben
- AND die Fehlermeldung verraet nicht, ob die E-Mail existiert (Sicherheit)

### Requirement: Benutzer-Registrierung

Das System MUST neue Benutzer-Registrierung mit E-Mail und Passwort ermoeglichen. Der Pfadfindername wird nicht bei der Registrierung, sondern spaeter im Profil gesetzt.

#### Scenario: Erfolgreiche Registrierung

- GIVEN eine gueltige E-Mail und ein Passwort (Felder: `email`, `password1`, `password2`)
- WHEN der Benutzer POST `/api/auth/register/` absendet
- THEN wird ein neues Benutzerkonto erstellt
- AND ein UserProfile wird automatisch angelegt (mit Standardwerten)
- AND der Benutzer wird eingeloggt (Session-Cookie gesetzt)
- AND die Benutzerdaten werden zurueckgegeben: `{ id, email, first_name, last_name, is_staff }`

#### Scenario: Doppelte E-Mail-Registrierung

- GIVEN eine E-Mail, die bereits ein Konto hat
- WHEN ein neuer Benutzer versucht sich mit dieser E-Mail zu registrieren
- THEN wird HTTP 400 mit einer passenden Fehlermeldung zurueckgegeben

#### Scenario: Schwaches Passwort

- GIVEN ein Passwort, das Djangos Passwort-Validatoren nicht erfuellt
- WHEN der Benutzer versucht sich zu registrieren
- THEN wird HTTP 400 mit Validierungsfehlern zurueckgegeben

#### Scenario: Passwoerter stimmen nicht ueberein

- GIVEN `password1` und `password2` sind unterschiedlich
- WHEN der Benutzer versucht sich zu registrieren
- THEN wird HTTP 400 mit einem Validierungsfehler zurueckgegeben

### Requirement: Session-Verwaltung

Das System MUST Session-Lebenszyklus-Verwaltung bereitstellen.

#### Scenario: Aktuellen Benutzer abrufen

- GIVEN eine authentifizierte Session
- WHEN das Frontend GET `/api/auth/me/` aufruft
- THEN werden die Daten des aktuellen Benutzers zurueckgegeben: `{ id, email, first_name, last_name, is_staff }`
- AND der `scout_name` ist NICHT in dieser Antwort enthalten (er befindet sich im UserProfile unter `/api/profile/me/`)

#### Scenario: Nicht-authentifizierter Benutzer-Check

- GIVEN keine aktive Session
- WHEN das Frontend GET `/api/auth/me/` aufruft
- THEN wird HTTP 401 zurueckgegeben (Frontend interpretiert als "nicht eingeloggt")

#### Scenario: Logout

- GIVEN eine authentifizierte Session
- WHEN der Benutzer POST `/api/auth/logout/` aufruft
- THEN wird die Session ungueltig gemacht
- AND das Session-Cookie wird geloescht

### Requirement: CSRF-Schutz

Das System MUST CSRF-Schutz fuer alle zustandsaendernden Anfragen aus dem SPA durchsetzen.

#### Scenario: CSRF-Token abrufen

- GIVEN das React-SPA wird geladen
- WHEN das Frontend GET `/api/auth/csrf/` aufruft
- THEN wird ein CSRF-Token sowohl im Cookie als auch im Response-Body zurueckgegeben
- AND das Frontend sendet dieses Token als `X-CSRFToken`-Header bei nachfolgenden POST/PATCH/DELETE-Anfragen mit

#### Scenario: Fehlendes CSRF-Token

- GIVEN eine zustandsaendernde Anfrage ohne CSRF-Token
- WHEN die Anfrage den Server erreicht
- THEN wird HTTP 403 zurueckgegeben

### Requirement: Frontend-Auth-Flow

Das Frontend MUST den Authentifizierungszustand ueber TanStack Query verwalten und Routen-Schutz bereitstellen.

#### Scenario: Auth-Check bei App-Start

- GIVEN das React-SPA wird geladen
- WHEN die App initialisiert wird
- THEN wird GET `/api/auth/me/` aufgerufen um die Session-Gueltigkeit zu pruefen
- AND der Auth-Zustand wird im TanStack Query Cache gespeichert (Query-Key: `['auth', 'me']`, staleTime: 10 Minuten)

#### Scenario: Geschuetzte Route (nicht authentifiziert)

- GIVEN ein nicht-authentifizierter Benutzer
- WHEN der Benutzer eine geschuetzte Route aufruft (z.B. /profile, /create)
- THEN wird der Benutzer zur Login-Seite weitergeleitet

#### Scenario: Auth-Zustand nach Login

- GIVEN ein erfolgreicher Login
- WHEN die Login-Antwort empfangen wird
- THEN wird der TanStack Query Auth-Cache direkt mit den Benutzerdaten gesetzt (kein Refetch noetig)
- AND der Benutzer wird zur gewuenschten Seite weitergeleitet

#### Scenario: Auth-Zustand nach Logout

- GIVEN ein erfolgreicher Logout
- WHEN die Logout-Antwort empfangen wird
- THEN wird der Auth-Cache auf `null` gesetzt
- AND alle TanStack Query Caches werden invalidiert

### Requirement: Admin-Rolle

Das System SHALL zwischen normalen Benutzern und Admin-Benutzern unterscheiden.

#### Scenario: Admin-Erkennung

- GIVEN ein authentifizierter Benutzer mit `is_staff=true`
- WHEN der Benutzer `/api/auth/me/` aufruft
- THEN enthaelt die Antwort `is_staff: true`
- AND das Frontend zeigt Admin-Navigationsoptionen an

#### Scenario: Admin-exklusive Endpunkte

- GIVEN ein authentifizierter Nicht-Admin-Benutzer
- WHEN der Benutzer versucht Admin-exklusive API-Endpunkte aufzurufen (unter `/api/admin/`)
- THEN wird HTTP 403 zurueckgegeben
