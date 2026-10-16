## Purpose
Diese Spezifikation definiert die synchronen API- und Frontend-Verträge sowie die Fehler- und Qualitätsanforderungen des Food-Bereichs.
## Requirements
### Requirement: Food-Responses sind explizit und synchron typisiert
Jeder geänderte Food-Endpunkt MUST ein Pydantic-Response-Schema und ein dazu synchrones Zod-Schema mit identischer Feldpräsenz, Optionalität, Nullbarkeit, Enum-Menge und numerischen Grenzen verwenden.

#### Scenario: Permission-Felder
- **WHEN** ein editierbares Food-Resource geladen wird
- **THEN** liefert die API `can_edit` und `can_delete`, und das Frontend verwendet diese serverseitigen Werte

#### Scenario: AI- und Quellenfelder
- **WHEN** eine MealPlan-, Recipe- oder AI-Response geparst wird
- **THEN** stimmen Felder wie `ai_interaction_id`, `recipe_id`, `cached_weight_g`, `shared_groups` und Quellen-Metadaten zwischen Backend und Frontend überein

### Requirement: Fehler werden typisiert und sichtbar behandelt
Food-Endpunkte MUST strukturierte Fehlerresponses mit korrektem HTTP-Status liefern; das Food-Frontend MUST Validierungs- und Netzwerkfehler auswerten und auf Deutsch anzeigen.

#### Scenario: Berechtigungsfehler
- **WHEN** ein Nutzer eine private Ressource oder eine nicht erlaubte Mutation anfragt
- **THEN** erhält er einen passenden 403- oder 404-Fehler ohne Datenleck und die UI zeigt eine verständliche Fehlermeldung

#### Scenario: Validierungsfehler
- **WHEN** das Backend eine ungültige Payload ablehnt
- **THEN** bleiben Status, Fehlercode und Validierungsdetails im zentralen Frontend-Fehlerparser erhalten

### Requirement: Food-Frontend ist build- und testfähig
Das Food-Frontend MUST TypeScript-, ESLint- und Vitest-Prüfungen ohne bekannte Blocker bestehen und Produktionscode darf keine untypisierten `any`-Umgehungen oder stillen Mutation-Fehler enthalten.

#### Scenario: Qualitätsprüfungen
- **WHEN** `npx tsc --noEmit`, `npm run lint` und `npm test -- --run` ausgeführt werden
- **THEN** bestehen alle Prüfungen ohne bekannte Fehler

### Requirement: Food API 5xx errors are safe, typed, and visible
Food API responses for server errors SHALL preserve the HTTP status and return a stable error code, a safe user-facing message, and a request correlation ID. Responses MUST NOT expose stack traces, SQL details, credentials, or other internal diagnostics. The Food frontend SHALL preserve status, code, and correlation ID in its typed API error and show a clear German error state or toast. It SHALL offer a retry for retryable reads and explicit user-controlled retry for mutations; it MUST NOT automatically replay a mutation after an ambiguous server failure.

#### Scenario: Food API returns HTTP 500
- **WHEN** a Food endpoint returns HTTP 500 with the standard error contract
- **THEN** the frontend SHALL identify the error as a server failure rather than a generic parsing or network error
- **THEN** the user SHALL see a German message that the server failed, the status code, and a support reference when available
- **THEN** the UI SHALL preserve entered form and selection state

#### Scenario: Server error response has no parseable body
- **WHEN** a Food endpoint returns HTTP 5xx with an empty, malformed, or non-JSON response body
- **THEN** the frontend SHALL still preserve the HTTP status and show the safe German fallback message
- **THEN** the UI MUST NOT display a JavaScript parsing error as the cause

#### Scenario: Retry after server failure
- **WHEN** a retryable Food read fails with HTTP 5xx and the user selects “Erneut versuchen”
- **THEN** the frontend SHALL retry that read and replace the error state with the response state
- **WHEN** a mutation fails with an ambiguous HTTP 5xx
- **THEN** the frontend SHALL keep the user's inputs and require an explicit retry action without automatically submitting a duplicate mutation
