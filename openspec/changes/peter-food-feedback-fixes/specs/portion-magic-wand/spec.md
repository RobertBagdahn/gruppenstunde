## ADDED Requirements

### Requirement: Creating a typical portion does not collide with the existing normal portion

When an editor applies a selected new portion whose suggested rank is 1 while the ingredient already has an active rank-1 portion, the system SHALL preserve the existing normal portion and assign the new portion the next available rank. A race that still violates the database uniqueness constraint SHALL return a conflict response, never an unhandled HTTP 500. The whole apply operation SHALL remain atomic.

#### Scenario: Add a piece portion alongside a weighted 100 g portion

- **GIVEN** an ingredient has a trusted active `100g` portion at rank 1
- **AND** an editor applies a selected `Stück` suggestion with a positive weight and suggested rank 1
- **WHEN** the suggestion is applied
- **THEN** the existing `100g` portion SHALL remain active at rank 1
- **AND** `Stück` SHALL be created at a free rank
- **AND** the response SHALL be successful with both portions in the active list

#### Scenario: Concurrent normal-portion change

- **GIVEN** the active normal portion changes after the preview was generated
- **WHEN** applying the suggestion violates the rank-1 uniqueness constraint
- **THEN** the endpoint SHALL return HTTP 409 with a German instruction to refresh the preview
- **AND** no partial portion/package changes SHALL remain
