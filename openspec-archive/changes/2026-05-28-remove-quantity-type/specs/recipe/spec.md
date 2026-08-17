## MODIFIED Requirements

### Requirement: RecipeItem stores quantity per person
A RecipeItem SHALL store `quantity` as the amount per single person. The system SHALL NOT have a `quantity_type` field. All quantities are implicitly per-person.

#### Scenario: Ingredient quantity interpretation
- **WHEN** a RecipeItem has quantity=50 and the recipe has servings=4
- **THEN** the system interprets this as 50 units of the portion per person (200 total for 4 persons)

## REMOVED Requirements

### Requirement: RecipeItem quantity_type field
**Reason**: The `quantity_type` distinction (`per_person`/`once`) was never correctly handled in display or shopping calculations, causing wrong results. All quantities are now uniformly per-person.
**Migration**: Existing `once` items are converted via data migration: `quantity = quantity / recipe.servings`
