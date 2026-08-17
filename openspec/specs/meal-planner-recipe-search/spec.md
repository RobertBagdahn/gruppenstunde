## Requirements

<!-- Modified from recipe-search-enhancement -->

### Requirement: Recipe search results display
The RecipeSearchDialog SHALL show a "Beliebteste Rezepte" section before search results when no search query is active, displaying 5-8 recipes split into personal and community rankings filtered by the current meal_type. Each popular item SHALL show the recipe_badge and price_per_serving.

#### Scenario: Dialog opens with no search query
- **WHEN** the RecipeSearchDialog opens and no search text is entered
- **THEN** a "Beliebteste" section SHALL be displayed showing up to 8 personal favorites and up to 8 community hits, filtered by the meal's meal_type
- **AND** each popular item SHALL display traffic light badge and price per serving

#### Scenario: User types search query
- **WHEN** the user enters a search query (≥2 chars)
- **THEN** the "Beliebteste" section SHALL be hidden and regular search results SHALL be shown

#### Scenario: User clears search query
- **WHEN** the user clears the search input back to empty
- **THEN** the "Beliebteste" section SHALL reappear

### Requirement: Extended search response schema
The recipe search response SHALL include additional preview fields for each recipe: image_url, portions, cached_energy_kcal, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_price_total, cached_nutri_class, nutritional_tags (array of {id, name}), usage_count, description (truncated to 200 chars), ingredients_preview (array of strings, max 8), recipe_badge ("verified"|"community"|"draft"), and price_per_serving (cached_price_total / portions, nullable).

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

<!-- Added from recipe-search-enhancement -->

### Requirement: Traffic light badge for recipe reliability
Every recipe in search, suggestion, and popular results SHALL display a recipe_badge indicating reliability: "verified" (owner=null, status=approved), "community" (owner!=null, visibility=public, status=approved), "draft" (owner=user, any status).

#### Scenario: Verified recipe badge
- **WHEN** a recipe with owner=null and status=approved appears in results
- **THEN** recipe_badge "verified" is returned and a green dot with label "Verifiziert" is displayed

#### Scenario: Community recipe badge
- **WHEN** a recipe with owner!=null, visibility=public, status=approved appears
- **THEN** recipe_badge "community" is returned and a yellow dot with label "Community" is displayed

#### Scenario: Own draft recipe badge
- **WHEN** the user's own recipe with status=draft appears in results
- **THEN** recipe_badge "draft" is returned and a red dot with label "Entwurf" is displayed

### Requirement: Category-specific fallback search
When a category-specific search yields fewer results than the requested limit, the system SHALL automatically expand to all recipe_types, filling remaining slots. The response SHALL include fallback_applied: true.

#### Scenario: Category has enough results
- **WHEN** searching for breakfast recipes and ≥limit results exist in breakfast+dessert
- **THEN** only category-specific results are returned with fallback_applied: false

#### Scenario: Category has zero results
- **WHEN** searching for breakfast recipes and 0 results exist in the mapped types
- **THEN** results from ALL recipe_types are returned with fallback_applied: true

#### Scenario: UI shows fallback notice
- **WHEN** fallback_applied is true in the response
- **THEN** the dialog displays "Keine [Frühstück]-Rezepte gefunden — zeige alle Typen"

### Requirement: Price per serving display
Every recipe in search, suggestion, and popular results SHALL include price_per_serving (cached_price_total / portions, computed in backend). When unavailable, null SHALL be returned and the UI SHALL display "—".

#### Scenario: Recipe with price
- **WHEN** a recipe has cached_price_total=12.50 and portions=1
- **THEN** price_per_serving is 12.50 and displays "12,50 €/P."

#### Scenario: Recipe without price
- **WHEN** a recipe has null cached_price_total
- **THEN** price_per_serving is null and "—" is displayed

### Requirement: Two-tier ranking (usage count then price)
All recipe search and suggestion results SHALL be sorted by usage_count descending, with cached_price_total ascending as tiebreaker. Recipes with null price SHALL sort last.

#### Scenario: Two recipes with same usage count
- **WHEN** two recipes both have usage_count=42
- **THEN** the one with lower cached_price_total appears first

#### Scenario: Recipe with null price
- **WHEN** a recipe has usage_count=30 and null cached_price_total
- **THEN** it sorts after recipes with usage_count=30 and any price value

### Requirement: Plan tags are exclusion filters
When a MealPlan provides `nutritional_tag_ids`, recipe search and random suggestions SHALL exclude
recipes matching any of those tags. The filter SHALL be applied in the database query before the
result limit and presented as an exclusion rule in the UI.

#### Scenario: Plan excludes peanut and milk
- **WHEN** searching for a plan with exclusion tags [peanut, milk]
- **THEN** a recipe matching either tag SHALL NOT be included

#### Scenario: Recipe matches no exclusion tag
- **WHEN** searching for a plan with exclusion tags [peanut, milk]
- **THEN** a recipe matching neither tag SHALL remain eligible

#### Scenario: Plan has no exclusion tags
- **WHEN** a plan has no nutritional tags
- **THEN** no tag-based exclusion SHALL be applied

### Requirement: Dessert in recipe type mapping
The dessert recipe_type SHALL be included in the MEAL_TYPE_TO_RECIPE_TYPES mapping for all meal_types in the backend.

#### Scenario: Mapping includes dessert for breakfast
- **WHEN** meal_type is "breakfast"
- **THEN** recipe_types searched include breakfast AND dessert

#### Scenario: Mapping includes dessert for lunch
- **WHEN** meal_type is "lunch"
- **THEN** recipe_types searched include warm_meal, cold_meal, AND dessert

### Requirement: Category pills instead of dropdown
The recipe_type filter in the RecipeSearchDialog SHALL use horizontally scrollable pills instead of a Select dropdown. The default selection SHALL be pre-set based on the meal's meal_type. "Alle" SHALL be the last option and SHALL clear the filter.

#### Scenario: Dialog opens for breakfast meal
- **WHEN** the RecipeSearchDialog opens for a breakfast meal
- **THEN** the pill matching the first recipe_type for breakfast is selected by default

#### Scenario: User selects "Alle"
- **WHEN** the user clicks the "Alle" pill
- **THEN** the recipe_type filter is cleared and all recipe types are searched

### Requirement: Recipe search cards with rich info
Each recipe result in the dialog SHALL be displayed as a card showing: traffic light badge, title, recipe_type badge, dietary tag badges, price_per_serving, and usage_count.

#### Scenario: Result card rendering
- **WHEN** a recipe result is rendered
- **THEN** it SHALL show colored dot (badge), title, dietary tag badges, price in "X,XX €/P." format, and usage count in "X× verwendet" format

### Requirement: Recently used recipes section
The RecipeSearchDialog SHALL show a "Kürzlich verwendet" section above search results, displaying the user's last 5 distinct recipes used plan-übergreifend (across all meal plans).

#### Scenario: User has recently used recipes
- **WHEN** the dialog opens and the user has previously added recipes to any meal plan
- **THEN** up to 5 recently used recipes are shown as compact cards with badge and price

#### Scenario: User has no recently used recipes
- **WHEN** the dialog opens and the user has never added a recipe
- **THEN** the "Kürzlich verwendet" section is not displayed

### Requirement: Own drafts visible in search
The recipe search SHALL include the user's own recipes regardless of approval status. Foreign drafts SHALL remain excluded.

#### Scenario: User searches and has own draft recipes
- **WHEN** the user searches for recipes
- **THEN** their own draft recipes appear with recipe_badge "draft"

#### Scenario: Another user's draft
- **WHEN** searching for recipes
- **THEN** drafts owned by other users SHALL NOT appear

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
