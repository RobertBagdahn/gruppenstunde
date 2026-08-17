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
The Food-App SHALL have its own Layout component with navigation containing only food-relevant menu items: Rezepte, Zutaten, Essensplan, Einkaufslisten.

#### Scenario: Navigation shows food items only
- **WHEN** user views the Food-App navigation
- **THEN** only Rezepte, Zutaten, Essensplan, and Einkaufslisten are shown as menu items

#### Scenario: No cross-domain navigation
- **WHEN** user views the Food-App navigation
- **THEN** no links to Sessions, Blog, Games, Events, or Planner are present

### Requirement: Food app shares auth session with main app
The Food-App SHALL use the same Django Allauth session-based authentication as the main app. Users logged in on one app MUST be authenticated on the other.

#### Scenario: Authenticated user accesses food app
- **WHEN** user is logged in via the main app on `localhost:5173`
- **AND** user navigates to `localhost:5174`
- **THEN** user is authenticated in the Food-App (same session cookie)

#### Scenario: Unauthenticated user sees login
- **WHEN** unauthenticated user accesses a protected Food-App page
- **THEN** user is redirected to login

### Requirement: Main app removes food-domain content
After the split, the main frontend SHALL NOT contain food-related pages, routes, or navigation entries.

#### Scenario: Food routes removed from main app
- **WHEN** user navigates to `/recipes` in the main app
- **THEN** the route does not exist (404 or redirect)

#### Scenario: Food navigation removed from main app
- **WHEN** user views the main app navigation
- **THEN** no Rezepte, Zutaten, Essensplan, or Einkaufslisten links are present
