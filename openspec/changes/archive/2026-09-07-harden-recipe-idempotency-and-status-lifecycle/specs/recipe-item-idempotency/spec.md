## ADDED Requirements

### Requirement: Recipe-item create requests support scoped idempotency
The recipe-item create endpoint SHALL accept an optional request identity for authenticated recipe editors. When present, the identity SHALL be unique within the user, recipe, and operation scope.

#### Scenario: First keyed create persists one item
- **WHEN** an authenticated recipe editor creates a recipe item with a new request identity
- **THEN** the endpoint SHALL create exactly one RecipeItem
- **THEN** the response SHALL contain the authoritative persisted item and its idempotency identity

#### Scenario: Matching replay returns the original item
- **WHEN** the same user submits the same recipe-item create request with the same request identity and the same logical payload again
- **THEN** the endpoint SHALL return the original persisted RecipeItem
- **THEN** the endpoint SHALL not create a second RecipeItem

#### Scenario: Reused identity with different payload is rejected
- **WHEN** the same user submits a different logical payload with an already-used request identity
- **THEN** the endpoint SHALL return a conflict response
- **THEN** the original RecipeItem SHALL remain unchanged

### Requirement: Idempotency is atomic and retryable after failure
A keyed recipe-item create SHALL persist its idempotency record and RecipeItem atomically. A failed create SHALL not reserve the request identity as a successful operation.

#### Scenario: Failed create can be retried
- **WHEN** a keyed create fails because the referenced portion or recipe is invalid
- **THEN** no RecipeItem SHALL be created
- **THEN** a later valid request using the same identity SHALL be allowed to succeed

#### Scenario: Concurrent matching creates converge
- **WHEN** two matching keyed create requests are processed concurrently
- **THEN** exactly one RecipeItem SHALL be persisted
- **THEN** both successful responses SHALL identify the same persisted item

### Requirement: Requests without an identity preserve current behavior
The endpoint SHALL continue to support requests without a request identity, but those requests SHALL not receive replay guarantees.

#### Scenario: Legacy create without key
- **WHEN** an authenticated client creates a recipe item without a request identity
- **THEN** the endpoint SHALL apply the request normally
- **THEN** separate identical requests MAY create separate RecipeItems
