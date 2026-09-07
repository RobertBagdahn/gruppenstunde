# food-production-integrity Specification

## Purpose
End-to-end security, calculation, provenance, validation, ordering, and export guarantees for the Food domain.

## Requirements

### Requirement: Secure food exports
Recipe and MealPlan shopping-list exports MUST verify server-side access. Private user-owned resources MUST NOT be disclosed to unrelated users.

#### Scenario: Authorized export
- **WHEN** an authenticated user exports an accessible recipe or MealPlan
- **THEN** the server returns the generated shopping list

#### Scenario: Unauthorized export
- **WHEN** an authenticated user exports another user's private recipe or MealPlan
- **THEN** the server returns a not-found or authorization error and creates no shopping list

### Requirement: Consistent recipe calculations
Shopping generation MUST use canonical active RecipeItem selection, including exchange defaults, explicit variants, soft-deleted portions, servings, item factors, overrides, and reserve scaling.

#### Scenario: Exchange group
- **WHEN** a recipe contains default and alternative exchange members
- **THEN** only the default member is included unless an explicit variant is selected

#### Scenario: Meal override
- **WHEN** a MealItem excludes or overrides a recipe ingredient
- **THEN** the shopping quantity reflects that exclusion or override

### Requirement: Lossless quantities
Unknown portion weights MUST NOT silently appear as a complete zero-gram purchase. Shopping quantities MUST be non-negative.

#### Scenario: Unknown weight
- **WHEN** a portion has no resolvable gram weight
- **THEN** the output preserves the original unit/quantity and marks the weight as unresolved

#### Scenario: Invalid quantity
- **WHEN** a client submits a negative shopping quantity
- **THEN** the API rejects the request and persists no negative value

### Requirement: Complete provenance
Generated shopping entries MUST preserve recipe, meal, and direct-ingredient provenance using nullable semantic IDs. Missing relations MUST NOT be represented by sentinel ID `0`.

#### Scenario: Recipe source
- **WHEN** a recipe contributes an ingredient to a MealPlan shopping list
- **THEN** the persisted source references the recipe and meal where available

#### Scenario: Direct ingredient source
- **WHEN** a direct ingredient contributes to a shopping list
- **THEN** the persisted source references the ingredient and meal where available

### Requirement: Correct views and exports
Shopping-list views MUST group by persisted source records, use database retail-section order, and use the persisted edited item name for external exports.

#### Scenario: Source view
- **WHEN** an item has a persisted recipe source and a conflicting note
- **THEN** the by-source view uses the source record rather than the note

#### Scenario: External export
- **WHEN** a user edits the name of a linked shopping item
- **THEN** external export uses the edited name while retaining the canonical linked identifier

### Requirement: Valid related references
Shopping-list item APIs MUST reject unknown ingredient and retail-section IDs instead of silently unlinking them.

#### Scenario: Unknown ingredient
- **WHEN** an item request contains an unknown ingredient ID
- **THEN** the API returns a validation error and creates or updates no item
