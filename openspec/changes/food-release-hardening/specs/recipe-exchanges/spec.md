## ADDED Requirements

### Requirement: Accessible draft ingredients may be recipe alternatives
An authenticated user who can edit a recipe SHALL be able to add an Ingredient as an exchange alternative while that Ingredient is in `draft` status, provided the Ingredient is readable by that user under the existing Food access policy. The operation MUST NOT change the Ingredient's verification status or visibility. Draft status alone MUST NOT block an otherwise authorized recipe alternative.

#### Scenario: Add an owned draft ingredient as an alternative
- **GIVEN** the user can edit a recipe and can read an Ingredient in `draft` status
- **WHEN** the user selects that Ingredient as an exchange alternative
- **THEN** the alternative SHALL be added without requiring the Ingredient to be verified
- **THEN** the Ingredient's status and visibility SHALL remain unchanged

#### Scenario: Private draft ingredient of another user
- **WHEN** a user tries to add a private draft Ingredient they cannot read
- **THEN** the API SHALL reject the request without revealing that Ingredient's data
- **THEN** no exchange group or RecipeItem SHALL be created or changed

### Requirement: Alternative creation is atomic and has a valid ingredient portion
The backend SHALL provide one atomic operation for adding an exchange alternative to a RecipeItem. The operation MUST verify edit permission for the recipe, access to the Ingredient that owns the selected active Portion, and that the Portion belongs to that Ingredient. It MUST create or reuse the exchange group, assign the source item, and create the alternative RecipeItem in one transaction. It MUST reject a missing, inactive, or mismatched Portion and MUST leave the recipe unchanged on failure. An exchange alternative MUST NOT be persisted without a resolvable Ingredient name.

#### Scenario: Alternative is added successfully
- **WHEN** the user submits an accessible draft or verified Ingredient with one of its active Portions
- **THEN** the source and new RecipeItem SHALL belong to the same exchange group at the correct positions
- **THEN** the new RecipeItem SHALL retain that Portion and return the Ingredient name

#### Scenario: Portion is missing or does not belong to the selected Ingredient
- **WHEN** the user submits an alternative with no valid active Portion or a Portion belonging to a different Ingredient
- **THEN** the API SHALL return a structured client error
- **THEN** no group membership or RecipeItem changes SHALL be committed

#### Scenario: A mutation fails during alternative creation
- **WHEN** any validation or database operation fails while adding an alternative
- **THEN** the transaction SHALL roll back all group and item changes
- **THEN** the existing source item SHALL remain in its pre-request state
