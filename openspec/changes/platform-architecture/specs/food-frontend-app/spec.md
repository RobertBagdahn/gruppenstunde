# Spec Delta: food-frontend-app

## MODIFIED Requirements

### Requirement: Food app runs as independent Vite application
The system SHALL provide a separate Vite/React application at `apps/essensplan/` inside the frontend workspace that runs independently from the other apps on port 5174.

#### Scenario: Start food app via Makefile
- **WHEN** developer runs `make essensplan`
- **THEN** the Food-App Vite dev server starts on `localhost:5174`

#### Scenario: Food app proxies API calls
- **WHEN** the Food-App makes a request to `/api/*`
- **THEN** the request is proxied to the backend on `localhost:8000`

### Requirement: Food app shares auth session with main app
The Food-App SHALL keep its own login page in its own design on `essensplan.app`, built from the shared platform login. It SHALL NOT provide its own profile, account, group or person pages. Its session SHALL be connected to the other apps via the platform session sync (`platform-sso`). Users logged in on another app MUST become authenticated in the Food-App without choosing a provider again.

#### Scenario: Authenticated user accesses food app
- **GIVEN** a user is logged in on Gruppenstunde
- **WHEN** the user opens the Food-App via the app switcher
- **THEN** the user is authenticated in the Food-App

#### Scenario: Unauthenticated user sees login
- **WHEN** an unauthenticated user without any platform session accesses a protected Food-App page
- **THEN** the user sees the Food-App login page and returns to that page after login

#### Scenario: Old profile route
- **WHEN** a user opens `/profile` or `/profile/account` in the Food-App
- **THEN** the user is redirected to the matching Konto-App page with a return link to the Food-App

### Requirement: Food functionality lives exclusively in the Food-Frontend
The apps `apps/gruppenstunde`, `apps/anmeldung` and `apps/konto` SHALL NOT contain any food-related code including recipes, ingredients, meal plans, shopping lists, or nutrition features. All food functionality SHALL be served exclusively by the Food-Frontend (`apps/essensplan/`). Other apps MAY show deep links to food objects.

#### Scenario: Haupt-Frontend contains no food routes
- **WHEN** a developer inspects the routes of `apps/gruppenstunde`, `apps/anmeldung` and `apps/konto`
- **THEN** there are no routes for `/recipes`, `/meal-plans`, `/shopping-lists`, or `/ingredients`

#### Scenario: Haupt-Frontend contains no food API hooks
- **WHEN** a developer searches the `src/api/` folders of the other apps for food-related files
- **THEN** no files for recipes, ingredients, mealPlans, mealEvents, shoppingLists, normPerson, or recipeHints exist

#### Scenario: Haupt-Frontend contains no food schemas
- **WHEN** a developer searches the `src/schemas/` folders of the other apps and `packages/` for food-related files
- **THEN** no files for recipe, ingredient, mealPlan, mealEvent, or shoppingList exist

#### Scenario: Haupt-Frontend contains no food components
- **WHEN** a developer searches the `src/components/` and `src/pages/` folders of the other apps
- **THEN** no recipe/, shopping/, or food-related components/pages exist

#### Scenario: Food navigation removed from main app
- **WHEN** user views the navigation of another app
- **THEN** no Rezepte, Zutaten, Essensplan, or Einkaufslisten links are present except the Essensplan entry in the app switcher
