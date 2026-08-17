## ADDED Requirements

### Requirement: Transitive visibility for referenced content
The system SHALL grant read access to content referenced by any content the user already has access to. When a user has access to a MealPlan (via ownership, collaboration, or verified status), they SHALL also have read access to all Recipes, Ingredients, and Portions referenced within that MealPlan's meals and items — regardless of those objects' individual status or creator. The same SHALL apply for Recipes referencing Ingredients and Portions: if a user can see a Recipe, they SHALL be able to see all its Ingredients and Portions.

Transitive visibility SHALL apply to detail endpoints only (not list endpoints). Objects visible only via transitive access SHALL NOT appear in global list views.

#### Scenario: Shared MealPlan reveals draft Recipe
- **WHEN** User B has access to a MealPlan (via ContentCollaborator role viewer)
- **AND** the MealPlan contains a Meal with a RecipeItem referencing a draft Recipe created by User A
- **THEN** User B SHALL be able to access `GET /api/recipes/{id}/` for that draft Recipe
- **THEN** `can_edit` SHALL be `false` and `can_delete` SHALL be `false` on the Recipe
- **THEN** the draft Recipe SHALL NOT appear in User B's global recipe list (`GET /api/recipes/`)

#### Scenario: Transitively visible Recipe reveals draft Ingredient
- **WHEN** User B has transitive access to a draft Recipe (via shared MealPlan)
- **AND** the Recipe contains a RecipeItem referencing a draft Ingredient created by User A
- **THEN** User B SHALL be able to access `GET /api/ingredients/{slug}/` for that draft Ingredient
- **THEN** the draft Ingredient SHALL NOT appear in User B's global ingredient list

#### Scenario: Transitively visible Ingredient reveals Portion
- **WHEN** User B has transitive access to a draft Ingredient (via shared MealPlan → Recipe → Ingredient)
- **THEN** User B SHALL be able to access `GET /api/ingredients/{slug}/portions/` for that Ingredient's portions

#### Scenario: Transitive access from directly shared Recipe
- **WHEN** User B has access to a draft Recipe (via ContentCollaborator)
- **AND** the Recipe contains RecipeItems referencing draft Ingredients
- **THEN** User B SHALL be able to access those Ingredients' detail endpoints

#### Scenario: Transitive access does not apply to list endpoints
- **WHEN** User B requests `GET /api/recipes/`
- **THEN** draft Recipes that are only transitively visible SHALL NOT appear in the list
- **THEN** User B SHALL only find them by navigating from the MealPlan detail page

#### Scenario: Staff and admin unaffected
- **WHEN** a staff user accesses any content
- **THEN** transitive visibility rules SHALL NOT be relevant (staff already sees everything)
