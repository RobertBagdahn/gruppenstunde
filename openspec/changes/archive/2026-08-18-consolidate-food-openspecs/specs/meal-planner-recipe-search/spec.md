## MODIFIED Requirements

### Requirement: Extended search response schema
The recipe search response SHALL use `portions`, `image_url`, nullable cached values, and `price_per_serving = cached_price_total / portions`. The backend response SHALL use a typed Pydantic schema and the Food frontend SHALL mirror it with Zod.

#### Scenario: Preview contract is complete
- **WHEN** a recipe is returned by search, popular, recently-used, or suggestion endpoints
- **THEN** the response uses the same typed field names, including `portions` and `image_url`

#### Scenario: Missing price is represented explicitly
- **WHEN** `cached_price_total` is null
- **THEN** `price_per_serving` is null and the frontend displays the defined empty-price state

### Requirement: Plan tags are exclusion filters
When a MealPlan supplies nutritional exclusion tags, recipe search and random suggestions SHALL exclude recipes matching any supplied tag before applying the result limit.

#### Scenario: Recipe matches an exclusion tag
- **WHEN** a plan excludes `peanut` and a recipe matches `peanut`
- **THEN** the recipe is not returned

#### Scenario: Recipe matches no exclusion tag
- **WHEN** a recipe matches none of the plan exclusion tags
- **THEN** it remains eligible for search results
