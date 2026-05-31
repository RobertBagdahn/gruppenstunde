## ADDED Requirements

### Requirement: Food app runs as independent Vite application
The system SHALL provide a separate Vite/React application at `frontend-food/` that runs independently from the main frontend on port 5174.

#### Scenario: Start food app via Makefile
- **WHEN** developer runs `make food`
- **THEN** the Food-App Vite dev server starts on `localhost:5174`

#### Scenario: Food app proxies API calls
- **WHEN** the Food-App makes a request to `/api/*`
- **THEN** the request is proxied to the backend on `localhost:8000`

### Requirement: Food app contains all food-domain pages
The Food-App SHALL include pages for: Rezepte (CRUD, Import, Cooking Mode), Zutaten (List, Create, Detail), Essensplan (Landing, List, Detail), Einkaufslisten (List, Detail), and Norm-Portionen-Simulator.

#### Scenario: Recipe pages available
- **WHEN** user navigates to `/recipes` in the Food-App
- **THEN** the RecipeListPage is rendered with full functionality

#### Scenario: Meal plan pages available
- **WHEN** user navigates to `/meal-plans` in the Food-App
- **THEN** the MealPlanLandingPage is rendered

#### Scenario: Shopping list pages available
- **WHEN** user navigates to `/shopping-lists` in the Food-App
- **THEN** the ShoppingListPage is rendered

#### Scenario: Norm portion simulator available
- **WHEN** user navigates to `/tools/norm-portion-simulator` in the Food-App
- **THEN** the NormPortionSimulatorPage is rendered

### Requirement: Food app has own navigation layout
The Food-App SHALL have its own Layout component with navigation containing only food-relevant menu items: Rezepte, Zutaten, Essensplan, Einkaufslisten. The navigation SHALL link "Essensplan" directly to `/meal-plans/app`. The mobile bottom navigation "Start" button SHALL navigate to `/` which displays the homepage.

#### Scenario: Navigation shows food items only
- **WHEN** user views the Food-App navigation
- **THEN** only Rezepte, Zutaten, Essensplan, and Einkaufslisten are shown as menu items

#### Scenario: No cross-domain navigation
- **WHEN** user views the Food-App navigation
- **THEN** no links to Sessions, Blog, Games, Events, or Planner are present

#### Scenario: Desktop nav Essensplan click
- **WHEN** a user clicks "Essensplan" in the desktop navigation
- **THEN** the user is navigated to `/meal-plans/app`

#### Scenario: Mobile bottom nav Start click
- **WHEN** a user taps "Start" in the mobile bottom navigation
- **THEN** the user is navigated to `/` which shows the homepage

#### Scenario: Norm-Portion-Simulator accessible from meal plan area
- **WHEN** user is on the meal plans list page (`/meal-plans/app`)
- **THEN** there is a visible link to the Norm-Portion-Simulator (`/tools/norm-portion-simulator`)

### Requirement: Food app shares auth session with main app
The Food-App SHALL use the same Django Allauth session-based authentication as the main app. Users logged in on one app MUST be authenticated on the other.

#### Scenario: Authenticated user accesses food app
- **WHEN** user is logged in via the main app on `localhost:5173`
- **AND** user navigates to `localhost:5174`
- **THEN** user is authenticated in the Food-App (same session cookie)

#### Scenario: Unauthenticated user sees login
- **WHEN** unauthenticated user accesses a protected Food-App page
- **THEN** user is redirected to login

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

#### Scenario: Food navigation removed from main app
- **WHEN** user views the main app navigation
- **THEN** no Rezepte, Zutaten, Essensplan, or Einkaufslisten links are present
