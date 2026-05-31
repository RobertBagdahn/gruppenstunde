## MODIFIED Requirements

### Requirement: Food functionality lives exclusively in the Food-Frontend
The Haupt-Frontend (`frontend/`) SHALL NOT contain any food-related code including recipes, ingredients, meal plans, shopping lists, or nutrition features. All food functionality SHALL be served exclusively by the Food-Frontend (`frontend-food/`).

#### Scenario: Haupt-Frontend contains no food routes
- **WHEN** a developer inspects `frontend/src/App.tsx`
- **THEN** there are no routes for `/recipes`, `/meal-plans`, `/shopping-lists`, or `/ingredients`

#### Scenario: Haupt-Frontend contains no food API hooks
- **WHEN** a developer searches `frontend/src/api/` for food-related files
- **THEN** no files for recipes, ingredients, mealPlans, mealEvents, shoppingLists, normPerson, or recipeHints exist

#### Scenario: Haupt-Frontend contains no food schemas
- **WHEN** a developer searches `frontend/src/schemas/` for food-related files
- **THEN** no files for recipe, ingredient, mealPlan, mealEvent, or shoppingList exist

#### Scenario: Haupt-Frontend contains no food components
- **WHEN** a developer searches `frontend/src/components/` and `frontend/src/pages/`
- **THEN** no recipe/, shopping/, or food-related components/pages exist

## REMOVED Requirements

### Requirement: Recipe approval in Haupt-Frontend admin
**Reason**: Recipe approval is moved to the Food-Frontend admin area where all food management belongs.
**Migration**: Use the Food-Frontend admin at `/admin` → "Freigaben" tab for recipe moderation.
