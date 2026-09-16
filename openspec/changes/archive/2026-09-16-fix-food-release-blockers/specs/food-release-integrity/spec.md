## ADDED Requirements

### Requirement: Release workflows use one authoritative mutation path
Release-relevante Food-Workflows SHALL use the dedicated Replacement-, Price-Approval- und Cache-Services as their authoritative mutation paths. Kein KI-Vorschlags-Endpoint DARF globale Preise oder Rezeptzutaten außerhalb dieser Services direkt mutieren.

#### Scenario: Legacy price batch apply
- **WHEN** ein Staff-User einen Data-Quality-Batch mit KI-Preisvorschlägen verarbeitet
- **THEN** SHALL für jede Zutat ein nachvollziehbarer `IngredientPriceProposal`-Status entstehen
- **THEN** DARF `Ingredient.price_per_kg` ohne explizite Bestätigung nicht global geändert werden

#### Scenario: Release contract verification
- **WHEN** Backend- und Food-Frontend-Verträge geprüft werden
- **THEN** SHALL Replacement-Metadaten, Proposal-Status und vollständige Preisabdeckung in Pydantic und Zod konsistent vorhanden sein
