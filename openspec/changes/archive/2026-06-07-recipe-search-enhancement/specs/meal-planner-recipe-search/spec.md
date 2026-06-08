## MODIFIED Requirements

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
The recipe search response SHALL include additional preview fields for each recipe: image, servings, cached_energy_kcal, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_price_total, cached_nutri_class, nutritional_tags (array of {id, name}), usage_count, description (truncated to 200 chars), ingredients_preview (array of strings, max 8), recipe_badge ("verified"|"community"|"draft"), and price_per_serving (cached_price_total / servings, nullable).

#### Scenario: Full recipe data available
- **WHEN** a recipe has all cached fields populated
- **THEN** the search response SHALL include all preview fields with their values, including recipe_badge and price_per_serving

#### Scenario: Recipe with null cached fields
- **WHEN** a recipe has null cached_energy_kcal or cached_price_total
- **THEN** those fields SHALL be returned as null, and price_per_serving SHALL be null

## ADDED Requirements

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
- **WHEN** searching for breakfast recipes and ≥limit results exist in breakfast+simple_meal+dessert
- **THEN** only category-specific results are returned with fallback_applied: false

#### Scenario: Category has zero results
- **WHEN** searching for breakfast recipes and 0 results exist in the mapped types
- **THEN** results from ALL recipe_types are returned with fallback_applied: true

#### Scenario: UI shows fallback notice
- **WHEN** fallback_applied is true in the response
- **THEN** the dialog displays "Keine [Frühstück]-Rezepte gefunden — zeige alle Typen"

### Requirement: Price per serving display
Every recipe in search, suggestion, and popular results SHALL include price_per_serving (cached_price_total / servings, computed in backend). When unavailable, null SHALL be returned and the UI SHALL display "—".

#### Scenario: Recipe with price
- **WHEN** a recipe has cached_price_total=12.50 and servings=5
- **THEN** price_per_serving is 2.50 and displays "2,50 €/P."

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

### Requirement: Hard dietary filter (AND) with override
When require_nutritional_tags is true, the search SHALL only return recipes matching ALL specified nutritional_tag_ids (AND logic). The filter SHALL be toggleable via a checkbox in the dialog.

#### Scenario: Plan requires vegan+gluten-free, recipe is only vegan
- **WHEN** searching with require_nutritional_tags=true for tags [vegan, gluten-free]
- **THEN** a recipe tagged only "vegan" SHALL NOT be included

#### Scenario: Plan requires vegan+gluten-free, recipe has both
- **WHEN** searching with require_nutritional_tags=true for tags [vegan, gluten-free]
- **THEN** a recipe tagged both "vegan" and "gluten-free" SHALL be included

#### Scenario: User disables dietary filter
- **WHEN** require_nutritional_tags is set to false
- **THEN** results include recipes regardless of dietary tags

### Requirement: Dessert in recipe type mapping
The dessert recipe_type SHALL be included in the MEAL_TYPE_TO_RECIPE_TYPES mapping for all meal_types in the backend.

#### Scenario: Mapping includes dessert for breakfast
- **WHEN** meal_type is "breakfast"
- **THEN** recipe_types searched include breakfast, simple_meal, AND dessert

#### Scenario: Mapping includes dessert for lunch
- **WHEN** meal_type is "lunch"
- **THEN** recipe_types searched include warm_meal, cold_meal, side_dish, AND dessert

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
