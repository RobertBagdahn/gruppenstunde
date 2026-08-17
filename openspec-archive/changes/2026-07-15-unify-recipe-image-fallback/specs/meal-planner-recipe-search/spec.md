## MODIFIED Requirements

### Requirement: Extended search response schema
The recipe search response SHALL include additional preview fields for each recipe: image_url, servings, cached_energy_kcal, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_price_total, cached_nutri_class, nutritional_tags (array of {id, name}), usage_count, description (truncated to 200 chars), ingredients_preview (array of strings, max 8), recipe_badge ("verified"|"community"|"draft"), and price_per_serving (cached_price_total / servings, nullable).

The response SHALL be produced by a typed Pydantic `Out` schema (not a raw `dict`), and the frontend Zod schema SHALL mirror it 1:1, including the `image_url` field name.

#### Scenario: Full recipe data available
- **WHEN** a recipe has all cached fields populated
- **THEN** the search response SHALL include all preview fields with their values, including recipe_badge, price_per_serving, and image_url

#### Scenario: Recipe with null cached fields
- **WHEN** a recipe has null cached_energy_kcal or cached_price_total
- **THEN** those fields SHALL be returned as null, and price_per_serving SHALL be null

#### Scenario: Recipe without an image
- **WHEN** a recipe has no uploaded image
- **THEN** `image_url` SHALL be returned as `null` (never an empty string)

## ADDED Requirements

### Requirement: Popular and recently-used recipe endpoints use typed schemas
The `/recipes/popular/` and `/recipes/recently-used/` endpoints SHALL each be declared with a dedicated Pydantic response schema instead of `response=dict`. Both schemas SHALL expose the recipe image field as `image_url`.

#### Scenario: Popular recipes response is typed
- **WHEN** a client calls `GET /api/planner/meal-plans/recipes/popular/`
- **THEN** the response SHALL validate against a Pydantic schema exposing `personal` and `community` lists, each item including `image_url`

#### Scenario: Recently-used recipes response is typed
- **WHEN** a client calls `GET /api/planner/meal-plans/recipes/recently-used/`
- **THEN** the response SHALL validate against a Pydantic schema exposing a `recipes` list, each item including `image_url`

### Requirement: Consistent image field naming across recipe-search-adjacent endpoints
All API endpoints under `planner/api/meal_plan.py` that return recipe preview data (search, popular, recently-used, suggestions) SHALL use the field name `image_url` for the recipe's image, matching the naming used by `RecipeListOut`/`ContentListOut`.

#### Scenario: Field name consistency across endpoints
- **WHEN** any of the recipe-preview-returning endpoints in `planner/api/meal_plan.py` includes a recipe image in its response
- **THEN** the field SHALL be named `image_url`, never `image`
</content>
