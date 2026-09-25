## MODIFIED Requirements

### Requirement: Ingredient reference exceptions
Two paths MAY reference Ingredients beyond normal read access, and only these:
1. MealItem creation and the buffet builder (`POST /api/meal-plans/{plan_id}/meals/{meal_id}/buffet/`, successor of the breakfast builder) MAY reference system draft Ingredients and system draft Recipes by ID (`allow_system_draft`). The buffet catalog itself SHALL list only Ingredients and Recipes the user can read.
2. The recipe ingredient matcher SHALL choose candidates from Ingredients the user can read plus system draft Ingredients (`owner=None`).

Neither path SHALL ever expose private or shared Ingredients of other users.

#### Scenario: Matcher does not leak private Ingredients
- **GIVEN** user B owns a private Ingredient "Omas Pesto"
- **WHEN** user A imports a recipe containing "Omas Pesto"
- **THEN** the matcher SHALL NOT propose B's Ingredient as candidate

#### Scenario: Matcher reuses system draft
- **GIVEN** a system draft Ingredient "Kidneybohnen aus der Dose" exists
- **WHEN** a non-staff user imports a recipe containing "Kidneybohnen aus der Dose"
- **THEN** the matcher SHALL propose the existing draft instead of creating a new Ingredient

#### Scenario: System draft added to meal plan
- **GIVEN** an editor of a meal plan
- **WHEN** they add a system draft Ingredient by ID to a meal
- **THEN** the MealItem SHALL be created

#### Scenario: Buffet builder saves system draft
- **GIVEN** an editor of a meal plan
- **WHEN** they save a buffet whose selection contains a system draft Ingredient by ID
- **THEN** the MealItem SHALL be created with the selected buffet role

#### Scenario: Buffet catalog hides system drafts from non-staff
- **WHEN** a non-staff user requests `GET /api/supply/buffet-catalog/`
- **THEN** system draft Ingredients they did not create SHALL NOT be listed

#### Scenario: Other user's private Ingredient added to meal plan
- **WHEN** a user adds another user's private Ingredient by ID to a meal, directly or via the buffet builder
- **THEN** the API SHALL return HTTP 404 and SHALL not create a MealItem
