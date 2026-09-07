## ADDED Requirements

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
