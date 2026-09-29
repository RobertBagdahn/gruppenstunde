# auth-error-contract Specification

## Purpose
TBD - created by archiving change social-login-open-access. Update Purpose after archive.
## Requirements
### Requirement: Einheitliches Fehlerformat mit Code

Alle API-Fehlerantworten SHALL das Format `{ detail: string, code: string, retry_after_seconds?: number }` haben. `detail` SHALL ein deutscher, für Endnutzer verständlicher Text sein. `code` SHALL ein stabiler englischer Bezeichner sein, an dem das Frontend Verhalten festmacht. Das Backend SHALL dafür eine `ApiError`-Ausnahme mit `status`, `code` und `detail` und einen zentralen Exception-Handler im `NinjaAPI` bereitstellen. Das Pydantic-Schema `ErrorOut` und das Zod-Schema `apiErrorSchema` SHALL synchron sein.

#### Scenario: Fehler hat einen Code
- **WHEN** ein Endpunkt einen `ApiError(403, "permission_denied", …)` auslöst
- **THEN** enthält die JSON-Antwort `detail` und `code: "permission_denied"`

### Requirement: Unterscheidung von 401 und 403

Fehlt eine Anmeldung, SHALL das System HTTP 401 mit `code: "auth_required"` liefern. Ist der Nutzer angemeldet, aber nicht berechtigt, SHALL das System HTTP 403 mit `code: "permission_denied"` liefern. Ist eine Ressource für den Nutzer nicht sichtbar, SHALL das System HTTP 404 liefern. Die Prüfungen SHALL über zentrale Helfer in `backend/core/permissions.py` erfolgen: `require_login(request, action=…)`, `require_staff(request)` und `deny(detail)`. Duplizierte lokale `_require_auth`- oder `require_auth`-Funktionen SHALL entfernt werden.

Standardtexte:

| code | Status | detail |
|---|---|---|
| `auth_required` | 401 | „Bitte melde dich an, um das zu speichern.“ (per `action` anpassbar, z. B. „…um diesen Essensplan zu bearbeiten.“) |
| `permission_denied` | 403 | „Dafür fehlt dir die Berechtigung. Frag die Person, der das gehört, oder einen Gruppen-Admin.“ |
| `staff_required` | 403 | „Dieser Bereich ist nur für das Inspi-Team.“ |
| `reauth_required` | 401 | „Bitte melde dich zur Sicherheit noch einmal an.“ |

#### Scenario: Anonymer Schreibzugriff
- **WHEN** ein nicht angemeldeter Client `POST /api/shopping-lists/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

#### Scenario: Angemeldet, aber fremde Ressource
- **WHEN** ein angemeldeter Nutzer ohne Bearbeitungsrecht `PATCH /api/recipes/{id}/` für ein sichtbares Rezept aufruft
- **THEN** antwortet das System mit HTTP 403 und `code: "permission_denied"`

#### Scenario: Nicht-Staff im Admin-Bereich
- **WHEN** ein angemeldeter Nicht-Staff `GET /api/admin/users/` aufruft
- **THEN** antwortet das System mit HTTP 403 und `code: "staff_required"`

#### Scenario: Keine lokalen Auth-Helfer mehr
- **WHEN** der Backend-Code durchsucht wird
- **THEN** existieren keine Funktionen `_require_auth` oder `require_auth` außerhalb von `core/permissions.py`

### Requirement: Zentrale Fehlerbehandlung im Frontend

Beide Frontends SHALL API-Fehler zentral über `ApiError` (mit `status` und `code`) auswerten:

- `auth_required` → Anmeldedialog mit dem `detail`-Text öffnen und Entwurf sichern (siehe `open-access`)
- `reauth_required` → Anmeldedialog im Modus „erneut anmelden“
- `permission_denied` / `staff_required` → Fehlerzustand bzw. Toast mit `detail`, ohne Anmeldedialog
- `ai_*`-Codes → Kontingent-Hinweis (siehe `ai-budget`), inklusive Zeitpunkt aus `retry_after_seconds`
- unbekannte Codes → `detail` oder ein generischer deutscher Text

Rohe Statuscodes oder englische Texte SHALL Endnutzern nicht angezeigt werden.

#### Scenario: Session läuft während der Bearbeitung ab
- **GIVEN** ein Nutzer bearbeitet einen Essensplan und seine Session ist abgelaufen
- **WHEN** eine Mutation HTTP 401 `auth_required` erhält
- **THEN** öffnet sich der Anmeldedialog
- **AND** nach der Anmeldung kann der Nutzer die Aktion wiederholen, ohne Eingaben zu verlieren

#### Scenario: Fehlende Berechtigung
- **WHEN** eine Mutation HTTP 403 `permission_denied` erhält
- **THEN** zeigt das Frontend einen Toast mit dem deutschen `detail`-Text
- **AND** der Anmeldedialog öffnet sich nicht
