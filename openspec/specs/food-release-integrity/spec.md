# food-release-integrity Specification

## Purpose
Anforderungen an food release integrity: Release workflows use one authoritative mutation path; Food release gates include the Food frontend and critical regression flows.
## Requirements
### Requirement: Release workflows use one authoritative mutation path
Release-relevante Food-Workflows SHALL use the dedicated Replacement-, Price-Approval- und Cache-Services as their authoritative mutation paths. Kein KI-Vorschlags-Endpoint DARF globale Preise oder Rezeptzutaten außerhalb dieser Services direkt mutieren.

#### Scenario: Legacy price batch apply
- **WHEN** ein Staff-User einen Data-Quality-Batch mit KI-Preisvorschlägen verarbeitet
- **THEN** SHALL für jede Zutat ein nachvollziehbarer `IngredientPriceProposal`-Status entstehen
- **THEN** DARF `Ingredient.price_per_kg` ohne explizite Bestätigung nicht global geändert werden

#### Scenario: Release contract verification
- **WHEN** Backend- und Food-Frontend-Verträge geprüft werden
- **THEN** SHALL Replacement-Metadaten, Proposal-Status und vollständige Preisabdeckung in Pydantic und Zod konsistent vorhanden sein

### Requirement: Food release gates include the Food frontend and critical regression flows
The release verification in the GitHub Actions deploy workflow SHALL run Food-frontend lint over the whole Food frontend, type-check, unit tests, and production build, together with the backend checks. It SHALL run the deterministic critical Food E2E tests for Buffet persistence and recipe alternatives before the build-and-deploy job starts. A failure in any required Food check MUST fail the release gate and block deployment.

#### Scenario: Food frontend regression is introduced
- **WHEN** a push to `main` introduces a failing Food type, lint, unit, build, or required E2E check
- **THEN** the check job SHALL fail
- **THEN** the build-and-deploy job MUST NOT run

#### Scenario: Food workflow returns an unexpected server error
- **WHEN** a required Buffet or recipe-alternative E2E flow receives an unexpected HTTP 5xx response
- **THEN** the relevant test and release check SHALL fail with the failing endpoint and status available in test output
