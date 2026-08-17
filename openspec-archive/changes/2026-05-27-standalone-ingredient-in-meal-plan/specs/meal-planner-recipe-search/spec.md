## MODIFIED Requirements

### Requirement: Recipe search endpoint returns unified results
The search endpoint `GET /api/meal-plans/recipes/search/` SHALL return both recipes and standalone ingredients in a structured response with two separate arrays.

#### Scenario: Search with text query
- **WHEN** user searches with `q=apfel`
- **THEN** response SHALL contain `recipes` array (matching recipes) and `ingredients` array (matching standalone ingredients with `name__icontains`)

#### Scenario: Search with recipe_type filter
- **WHEN** user filters by `recipe_type=snack`
- **THEN** `recipes` array SHALL contain only recipes with `recipe_type=snack`
- **AND** `ingredients` array SHALL contain only standalone ingredients with `standalone_type=snack`

#### Scenario: Search with nutritional_tag_ids
- **WHEN** user filters with `nutritional_tag_ids=1,2`
- **THEN** both recipes and ingredients SHALL be filtered by ALL specified tag IDs

#### Scenario: Ingredient results include portions
- **WHEN** standalone ingredients are returned in search results
- **THEN** each ingredient SHALL include its `portions` array with `id`, `name`, `measuring_unit`, `quantity`, `weight_g`

#### Scenario: Empty search returns results based on filters
- **WHEN** `q` is empty but `recipe_type` is set
- **THEN** system SHALL return recipes and ingredients matching the type filter (up to limit)
