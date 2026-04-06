# error-handling Specification

## Purpose

Querschnittsspezifikation fuer die einheitliche Fehlerbehandlung ueber alle API-Endpunkte und Frontend-Komponenten der Inspi-Plattform. Definiert Standard-Fehlerformate, HTTP-Statuscodes, Fehlermeldungen und das Verhalten von Frontend-Komponenten bei Fehlern.

## Context

- **Backend**: Django Ninja `HttpError` in allen API-Routers
- **Frontend**: TanStack Query `error` State + Fehler-Komponenten
- **Querschnittsthema**: Gilt fuer alle Spec-Domaenen

## Requirements

### Requirement: Standard-Fehlerformat

Das System MUST ein einheitliches JSON-Fehlerformat fuer alle API-Antworten verwenden.

#### Scenario: Fehler-Response-Format

- GIVEN ein API-Endpunkt, der einen Fehler zurueckgibt
- WHEN der Client die Antwort empfaengt
- THEN hat die Antwort folgendes Format:

```json
{
  "detail": "Menschenlesbare Fehlermeldung auf Deutsch"
}
```

- AND der HTTP-Statuscode entspricht der Fehlerart (siehe unten)

#### Scenario: Validierungsfehler-Format

- GIVEN ein API-Endpunkt, der ungueltige Eingabedaten empfaengt
- WHEN Pydantic die Validierung ablehnt
- THEN gibt Django Ninja automatisch HTTP 422 zurueck mit:

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "feldname"],
      "msg": "Fehlerbeschreibung",
      "ctx": {}
    }
  ]
}
```

### Requirement: HTTP-Statuscodes

Das System MUST folgende HTTP-Statuscodes konsistent verwenden.

#### Scenario: Erfolgreiche Operationen

- GIVEN eine erfolgreiche API-Anfrage
- THEN werden folgende Statuscodes verwendet:
  - `200 OK` — Erfolgreiche GET-, PATCH-, DELETE-Anfragen
  - `201 Created` — Erfolgreiche POST-Anfragen, die eine Ressource erstellen

#### Scenario: Client-Fehler

- GIVEN eine fehlerhafte Client-Anfrage
- THEN werden folgende Statuscodes verwendet:
  - `400 Bad Request` — Ungueltige Anfrage (z.B. fehlende Pflichtfelder, ungueltige Werte)
  - `401 Unauthorized` — Nicht authentifiziert (keine gueltige Session)
  - `403 Forbidden` — Authentifiziert, aber keine Berechtigung (z.B. nicht Owner, nicht Admin)
  - `404 Not Found` — Ressource existiert nicht (z.B. Idea mit unbekanntem Slug)
  - `409 Conflict` — Konflikt (z.B. Slug bereits vergeben, doppelte Emotion)
  - `422 Unprocessable Entity` — Validierungsfehler (Pydantic-Schema-Verletzung)
  - `429 Too Many Requests` — Rate-Limit ueberschritten (geplant fuer AI-Endpunkte)

#### Scenario: Server-Fehler

- GIVEN ein unerwarteter Server-Fehler
- THEN wird `500 Internal Server Error` zurueckgegeben
- AND der Fehler wird serverseitig geloggt (nicht dem Client exponiert)
- AND die Client-Antwort enthaelt eine generische Meldung:

```json
{
  "detail": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es spaeter erneut."
}
```

### Requirement: Authentifizierungs-Fehler

Das System MUST klar zwischen "nicht angemeldet" (401) und "nicht berechtigt" (403) unterscheiden.

#### Scenario: Nicht authentifiziert

- GIVEN ein Benutzer ohne gueltige Session
- WHEN er einen geschuetzten Endpunkt aufruft
- THEN wird HTTP 403 zurueckgegeben (Django Ninja Standard)
- AND die Fehlermeldung lautet: `"Anmeldung erforderlich"`

> **Hinweis**: Django Ninja verwendet standardmaessig 403 statt 401 fuer nicht-authentifizierte Anfragen. Dies ist eine bewusste Abweichung vom REST-Standard, die im gesamten Projekt konsistent eingehalten wird.

#### Scenario: Nicht berechtigt

- GIVEN ein authentifizierter Benutzer ohne ausreichende Rechte
- WHEN er eine Operation ausfuehrt, fuer die er nicht berechtigt ist
- THEN wird HTTP 403 zurueckgegeben
- AND die Fehlermeldung beschreibt den Grund (z.B. "Nur der Besitzer kann diese Idee bearbeiten", "Nur Admins")

### Requirement: Ressourcen-Fehler

Das System MUST bei nicht gefundenen Ressourcen konsistente 404-Antworten liefern.

#### Scenario: Idea nicht gefunden (Slug)

- GIVEN eine Anfrage auf `/api/ideas/by-slug/{slug}/`
- WHEN keine Idea mit diesem Slug existiert
- THEN wird HTTP 404 zurueckgegeben
- AND die Fehlermeldung lautet: `"Idea nicht gefunden"`

#### Scenario: Ressource nicht gefunden (generisch)

- GIVEN eine Anfrage auf einen Detail-Endpunkt mit ungueltiger ID oder Slug
- WHEN die Ressource nicht existiert
- THEN wird HTTP 404 zurueckgegeben
- AND Django Ninjas `get_object_or_404` wird konsistent verwendet

### Requirement: Frontend-Fehlerbehandlung

Das Frontend MUST API-Fehler einheitlich behandeln und dem Benutzer verstaendlich anzeigen.

#### Scenario: Lade-Fehler in Listen

- GIVEN eine Seite, die Daten per TanStack Query laedt
- WHEN die API einen Fehler zurueckgibt
- THEN wird eine Fehler-Komponente angezeigt mit:
  - Verstaendlicher Fehlermeldung auf Deutsch
  - "Erneut versuchen"-Button (triggert Query-Refetch)
- AND kein Skeleton/Spinner wird mehr angezeigt

#### Scenario: Lade-Fehler auf Detail-Seiten

- GIVEN eine Detail-Seite (z.B. IdeaPage mit `/idea/:slug`)
- WHEN die API 404 zurueckgibt
- THEN wird eine "Nicht gefunden"-Seite angezeigt
- AND die Seite enthaelt einen Link zurueck zur Suche oder Startseite

#### Scenario: Mutations-Fehler

- GIVEN der Benutzer fuehrt eine Aktion aus (z.B. Idea erstellen, Kommentar posten)
- WHEN die API einen Fehler zurueckgibt
- THEN wird eine Toast-Benachrichtigung mit der Fehlermeldung angezeigt
- AND das Formular bleibt mit den eingegebenen Daten erhalten (kein Datenverlust)
- AND der Submit-Button wird wieder aktiviert

#### Scenario: Netzwerk-Fehler

- GIVEN der Client hat keine Internetverbindung
- WHEN eine API-Anfrage fehlschlaegt
- THEN wird eine Offline-Fehlermeldung angezeigt: "Keine Internetverbindung. Bitte pruefe deine Verbindung."
- AND TanStack Query fuehrt automatische Retries durch (Standard: 3 Versuche)

#### Scenario: Session abgelaufen

- GIVEN ein angemeldeter Benutzer, dessen Session abgelaufen ist
- WHEN eine geschuetzte Anfrage HTTP 403 zurueckgibt
- THEN wird der `useCurrentUser`-Query invalidiert
- AND der Benutzer wird zur Login-Seite weitergeleitet
- AND eine Nachricht wird angezeigt: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."

### Requirement: Fehlermeldungen auf Deutsch

Das System MUST alle benutzersichtbaren Fehlermeldungen auf Deutsch zurueckgeben.

#### Scenario: Backend-Fehlermeldungen

- GIVEN ein API-Endpunkt, der `HttpError` ausloest
- WHEN die Fehlermeldung formuliert wird
- THEN ist die Meldung auf Deutsch und verstaendlich fuer Endbenutzer
- AND technische Details (Stacktrace, DB-Fehler) werden NICHT exponiert

**Standard-Fehlermeldungen**:

| Kontext | Meldung |
|---------|---------|
| Nicht angemeldet | "Anmeldung erforderlich" |
| Keine Berechtigung | "Keine Berechtigung fuer diese Aktion" |
| Nicht gefunden | "{Ressource} nicht gefunden" |
| Validierung | "Ungueltige Eingabe: {Feld}" |
| Duplikat | "{Ressource} existiert bereits" |
| Server-Fehler | "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es spaeter erneut." |
| Rate-Limit | "Zu viele Anfragen. Bitte warte einen Moment." |

## Betroffene Dateien

### Backend
| Datei | Relevanz |
|-------|----------|
| `backend/idea/api.py` | HttpError-Verwendung in Ideas, Tags, AI, Admin, Materials Routers |
| `backend/core/api.py` | Auth-Fehler (Login, Register, CSRF) |
| `backend/event/api.py` | Event-, Persons-, Locations-Fehler |
| `backend/profiles/api.py` | Profil-, Gruppen-Fehler |
| `backend/planner/api.py` | Planer-Fehler |

### Frontend
| Datei | Relevanz |
|-------|----------|
| `frontend/src/api/*.ts` | TanStack Query Error-Handling in allen Hook-Dateien |
| `frontend/src/pages/*.tsx` | Fehler-UI in allen Seiten-Komponenten |
| `frontend/src/components/Layout.tsx` | Globale Fehler-Boundary |

### Requirement: Sentry-Integration (Frontend)

Das Frontend MUST alle unbehandelten Fehler und API-Fehler an Sentry melden.

#### Scenario: API-Fehler an Sentry melden

- GIVEN ein API-Call, der fehlschlaegt
- WHEN der Fehler im Frontend verarbeitet wird
- THEN wird der Fehler an Sentry gesendet mit:
  - HTTP-Statuscode
  - Request-URL und -Methode
  - Benutzer-ID (falls angemeldet)
  - Fehler-Response-Body
- AND dem Benutzer wird ein Toast mit der deutschen Fehlermeldung angezeigt

#### Scenario: Unbehandelte Frontend-Fehler

- GIVEN ein unerwarteter JavaScript-Fehler (Rendering, Logik)
- WHEN die globale Error Boundary den Fehler faengt
- THEN wird der Fehler mit Stacktrace an Sentry gemeldet
- AND dem Benutzer wird eine Fallback-UI angezeigt: "Etwas ist schiefgelaufen. Bitte lade die Seite neu."
- AND ein "Seite neu laden"-Button wird angezeigt

### Requirement: Structured JSON Logging (Backend)

Das Backend MUST strukturiertes JSON-Logging verwenden (python-json-logger).

#### Scenario: Request-Logging

- GIVEN ein eingehender API-Request
- WHEN der Request verarbeitet wird
- THEN wird ein strukturierter Log-Eintrag erstellt mit:
  - `timestamp` (ISO 8601)
  - `level` (INFO, WARNING, ERROR)
  - `message` (Beschreibung)
  - `request_id` (eindeutige ID pro Request)
  - `method` (HTTP-Methode)
  - `path` (URL-Pfad)
  - `status_code` (HTTP-Statuscode)
  - `user_id` (falls authentifiziert)
  - `duration_ms` (Request-Dauer)

#### Scenario: Fehler-Logging

- GIVEN ein unerwarteter Server-Fehler (500)
- WHEN der Fehler geloggt wird
- THEN enthaelt der Log-Eintrag zusaetzlich:
  - `exception_type` (Klasse der Exception)
  - `exception_message` (Fehlermeldung)
  - `stacktrace` (vollstaendiger Stacktrace)
- AND der Log wird als JSON in Cloud Logging geschrieben (durchsuchbar)

### Requirement: Bestaetigungsdialoge bei destruktiven Aktionen

Das Frontend MUST vor jeder destruktiven Aktion einen Bestaetigungsdialog anzeigen.

#### Scenario: Loeschen einer Ressource

- GIVEN ein Benutzer klickt auf "Loeschen" (Idea, Kommentar, Event, Packliste, etc.)
- WHEN die Aktion destruktiv und nicht rueckgaengig machbar ist
- THEN wird ein Bestaetigungsdialog angezeigt mit:
  - Klarer Beschreibung der Aktion auf Deutsch
  - "Abbrechen"-Button (sekundaer, links)
  - "Loeschen"-Button (destructive Variante, rot, rechts)
- AND die Aktion wird NICHT ausgefuehrt, bis der Benutzer bestaetigt
- AND waehrend der Ausfuehrung zeigt der Button einen Spinner

#### Scenario: Bestaetigungsdialog UI-Pattern

- GIVEN ein Bestaetigungsdialog wird angezeigt
- THEN wird die shadcn/ui AlertDialog-Komponente verwendet
- AND der Dialog ist per Escape-Taste schliessbar
- AND ein Klick auf den Overlay schliesst den Dialog NICHT (Schutz vor versehentlichem Schliessen)

### Requirement: Erfolgs-Feedback

Das Frontend MUST nach erfolgreichen Mutationen dem Benutzer Feedback geben.

#### Scenario: Ressource erstellt oder bearbeitet

- GIVEN ein Benutzer erstellt oder bearbeitet eine Ressource erfolgreich
- WHEN die API 200/201 zurueckgibt
- THEN wird ein Erfolgs-Toast angezeigt (z.B. "Idee gespeichert", "Event erstellt")
- AND der Benutzer wird zur Detail-Seite der Ressource weitergeleitet

#### Scenario: Ressource geloescht

- GIVEN ein Benutzer loescht eine Ressource erfolgreich
- WHEN die API 200 zurueckgibt
- THEN wird ein Erfolgs-Toast angezeigt (z.B. "Idee geloescht")
- AND der Benutzer wird zur uebergeordneten Listen-Seite weitergeleitet

### Requirement: API-Fehler-Envelope

Alle API-Antworten MUST ein einheitliches Envelope-Format verwenden.

#### Scenario: Erfolgreiche Antwort

- GIVEN ein API-Endpunkt, der erfolgreich antwortet
- THEN hat die Antwort folgendes Format:

```json
{
  "data": { ... }
}
```

- AND Listen verwenden das paginierte Format: `{ items, total, page, page_size, total_pages }`

#### Scenario: Fehler-Antwort

- GIVEN ein API-Endpunkt, der einen Fehler zurueckgibt
- THEN hat die Antwort folgendes Format:

```json
{
  "error_code": "NOT_FOUND",
  "message": "Idee nicht gefunden",
  "details": {}
}
```

- AND `error_code` ist ein maschinenlesbarer Code (UPPER_SNAKE_CASE)
- AND `message` ist eine menschenlesbare Meldung auf Deutsch
- AND `details` ist optional und enthaelt zusaetzliche Informationen (z.B. Feld-Fehler)

**Standard Error-Codes**:

| Code | HTTP-Status | Beschreibung |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Pydantic/Zod-Validierungsfehler |
| `NOT_FOUND` | 404 | Ressource existiert nicht |
| `UNAUTHORIZED` | 403 | Nicht angemeldet |
| `FORBIDDEN` | 403 | Keine Berechtigung |
| `CONFLICT` | 409 | Duplikat / Konflikt |
| `BAD_REQUEST` | 400 | Ungueltige Anfrage |
| `RATE_LIMITED` | 429 | Zu viele Anfragen |
| `INTERNAL_ERROR` | 500 | Unerwarteter Server-Fehler |

## Planned Features

- **Rate-Limiting Middleware**: Globales Rate-Limiting mit 429-Responses (geplant fuer AI- und Comment-Endpunkte)
- **Retry-Logik**: Konfigurierbare Retry-Parameter pro TanStack Query Hook (staleTime, retry, retryDelay)
