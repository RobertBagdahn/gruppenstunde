## ADDED Requirements

### Requirement: Pricing table API endpoint
Das System SHALL einen Admin-Endpoint bereitstellen, der die aktuelle `GEMINI_PRICING`-Konfiguration als JSON ausgibt.

#### Scenario: Staff user requests pricing table
- **WHEN** ein authentifizierter Staff-User `GET /api/content/admin/ai-pricing/` aufruft
- **THEN** SHALL die Antwort ein JSON-Objekt mit `pricing` (Array von Pricing-Einträgen) und `usd_to_eur` (Float) enthalten
- **THEN** jeder Pricing-Eintrag SHALL enthalten: `model`, `type`, `input_per_1m_usd`, `output_per_1m_usd` (optional), `image_output_per_1m_usd` (optional)

#### Scenario: Non-staff user denied
- **WHEN** ein nicht-Staff-User `GET /api/content/admin/ai-pricing/` aufruft
- **THEN** SHALL das System mit HTTP 403 antworten

#### Scenario: Unauthenticated user denied
- **WHEN** ein nicht-eingeloggter User `GET /api/content/admin/ai-pricing/` aufruft
- **THEN** SHALL das System mit HTTP 403 antworten

### Requirement: Time-range filtering on stats endpoint
Der Stats-Endpoint `GET /api/content/admin/ai-interactions/stats/` SHALL optionale `date_from` und `date_to` Query-Parameter akzeptieren.

#### Scenario: Stats without date filter (backward compatible)
- **WHEN** `GET /api/content/admin/ai-interactions/stats/` ohne `date_from`/`date_to` aufgerufen wird
- **THEN** SHALL das Verhalten unverändert sein (alle Daten seit Beginn)

#### Scenario: Stats with date_from only
- **WHEN** `GET /api/content/admin/ai-interactions/stats/?date_from=2026-06-01` aufgerufen wird
- **THEN** SHALL nur `AiInteraction`-Records mit `created_at__date >= 2026-06-01` aggregiert werden
- **THEN** die Timeline SHALL nur Tage ab `date_from` enthalten

#### Scenario: Stats with date_from and date_to
- **WHEN** `GET /api/content/admin/ai-interactions/stats/?date_from=2026-06-01&date_to=2026-06-30` aufgerufen wird
- **THEN** SHALL nur Records mit `created_at__date` zwischen den Daten aggregiert werden

#### Scenario: Stats with invalid date format
- **WHEN** `GET /api/content/admin/ai-interactions/stats/?date_from=invalid` aufgerufen wird
- **THEN** SHALL das System mit HTTP 400 und einer verständlichen Fehlermeldung antworten

### Requirement: Time-range filtering on user-costs endpoint
Der User-Costs-Endpoint `GET /api/content/admin/ai-interactions/user-costs/` SHALL optionale `date_from` und `date_to` Query-Parameter akzeptieren.

#### Scenario: User costs without date filter
- **WHEN** `GET /api/content/admin/ai-interactions/user-costs/` ohne Parameter aufgerufen wird
- **THEN** SHALL das Verhalten unverändert sein (alle Daten)

#### Scenario: User costs with date filter
- **WHEN** `GET /api/content/admin/ai-interactions/user-costs/?date_from=2026-06-01` aufgerufen wird
- **THEN** SHALL nur Calls im angegebenen Zeitraum aggregiert werden
- **THEN** `cost_30d_eur` SHALL weiterhin die letzten 30 Tage ab heute berechnen (unabhängig vom Filter)

### Requirement: Include-background parameter on user-costs endpoint
Der User-Costs-Endpoint SHALL den `include_background` Query-Parameter unterstützen, konsistent mit dem Stats-Endpoint.

#### Scenario: User costs exclude background by default
- **WHEN** `GET /api/content/admin/ai-interactions/user-costs/` ohne `include_background` aufgerufen wird
- **THEN** SHALL `is_background=False` Calls ausgeschlossen sein

#### Scenario: User costs include background
- **WHEN** `GET /api/content/admin/ai-interactions/user-costs/?include_background=true` aufgerufen wird
- **THEN** SHALL alle Calls (inkl. background) aggregiert werden
