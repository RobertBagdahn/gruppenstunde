# ai-price-approval Specification

## Purpose
TBD - created by archiving change add-ai-price-approval. Update Purpose after archive.
## Requirements
### Requirement: AI proposes missing ingredient prices
The system SHALL generate a structured price proposal in EUR per kilogram for ingredients with missing prices. Data-quality batch evaluation SHALL reuse or create the same pending `IngredientPriceProposal` records as the ingredient detail workflow.

#### Scenario: Missing price proposal
- **WHEN** an authorized user requests an AI price for an ingredient with `price_per_kg=NULL` or `0`
- **THEN** the API SHALL return a pending proposal with price, confidence, rationale and source metadata

#### Scenario: Existing positive price
- **WHEN** an ingredient already has a positive price
- **THEN** the default proposal endpoint SHALL not overwrite it or create an automatic replacement

### Requirement: User approves global price
The system SHALL require explicit confirmation before applying a proposed price to the global Ingredient record. Legacy Data-Quality batch actions SHALL NOT bypass this requirement.

#### Scenario: Accept proposal
- **WHEN** an authorized user accepts a pending proposal
- **THEN** the ingredient `price_per_kg` SHALL be updated globally
- **THEN** the proposal SHALL become accepted with reviewer and timestamp
- **THEN** dependent recipe caches SHALL be invalidated or recalculated

#### Scenario: Reject proposal
- **WHEN** an authorized user rejects a pending proposal
- **THEN** the ingredient price SHALL remain unchanged
- **THEN** the proposal SHALL become rejected

#### Scenario: Data-quality batch apply
- **WHEN** a Staff-User einen aus der Preisanalyse erzeugten Batch verarbeitet
- **THEN** SHALL jeder Eintrag einzeln als Proposal-Ergebnis (`pending`, `accepted`, `rejected` oder `conflict`) ausgewiesen werden
- **THEN** DARF ein positiver bestehender Preis nur mit expliziter Ersetzungsentscheidung überschrieben werden

### Requirement: Proposal authorization
Only users with permission to edit the ingredient or staff users SHALL create or approve proposals.

#### Scenario: Unauthenticated request
- **WHEN** an unauthenticated user requests or approves a price proposal
- **THEN** the API SHALL return HTTP 403

### Requirement: Price provenance
Accepted prices SHALL expose whether they were manually entered or accepted from AI and retain the proposal history.

#### Scenario: Accepted AI price displayed
- **WHEN** a price was accepted from an AI proposal
- **THEN** ingredient and data-quality responses SHALL expose its provenance
