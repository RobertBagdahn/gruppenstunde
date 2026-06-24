## ADDED Requirements

### Requirement: Allergen scanner endpoint returns all violations
The system SHALL provide GET /api/meal-plans/{id}/allergen-scan/ that returns all meals/recipes violating the MealPlan's allergen tags.

#### Scenario: Successful scan with violations
- **WHEN** MealPlan has allergen_tag_ids [3, 7] (Erdnüsse, Gluten)
- **WHEN** MealPlan has meals with recipes tagged with those allergens
- **WHEN** GET /api/meal-plans/{id}/allergen-scan/
- **THEN** response 200 with { allergen_tags, violations[], summary }
- **THEN** violations array contains one entry per meal-recipe-allergen combination

#### Scenario: Successful scan with no violations
- **WHEN** MealPlan has allergen_tag_ids [3] (Erdnüsse)
- **WHEN** no recipe in MealPlan has that allergen tag
- **WHEN** GET /api/meal-plans/{id}/allergen-scan/
- **THEN** response 200 with violations: [] and summary.total_violations: 0

#### Scenario: Unauthorized access returns 403
- **WHEN** unauthenticated request to GET /api/meal-plans/{id}/allergen-scan/
- **THEN** response 403 "Anmeldung erforderlich"

#### Scenario: No access to MealPlan returns 404
- **WHEN** authenticated user without access to MealPlan calls scanner
- **THEN** response 404 "Essensplan nicht gefunden"

#### Scenario: Scanner only checks recipe nutritional_tags (not direct ingredients)
- **WHEN** MealItem has ingredient (not recipe) with allergen tag
- **WHEN** scanner runs
- **THEN** that MealItem is NOT reported as violation (current scope: recipes only)

### Requirement: Scanner response structure
The system SHALL return violations with meal, recipe, allergen tag, and source information.

#### Scenario: Violation object contains required fields
- **WHEN** scanner returns violations
- **THEN** each violation has: meal_id, meal_type, date, recipe_id, recipe_title, allergen_tag, source

#### Scenario: Source indicates detection method
- **WHEN** violation detected via recipe.nutritional_tags
- **THEN** source = "recipe_tag"

#### Scenario: Summary aggregates violation counts
- **WHEN** scanner returns summary
- **THEN** summary has: total_violations, affected_meals (unique meal_ids), unique_allergens (unique allergen_tag_ids)

### Requirement: Scanner performance with prefetching
The system SHALL execute scanner query efficiently using prefetch_related to avoid N+1 queries.

#### Scenario: Scanner uses optimized queryset
- **WHEN** scanner endpoint executes
- **THEN** queryset prefetches: meals__items__recipe__nutritional_tags
- **THEN** single query fetches all needed data for violation detection
