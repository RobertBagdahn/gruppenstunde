# Spec Delta

## MODIFIED Requirements

### Requirement: Homepage displays module statistics
The system SHALL display a homepage at route `/` showing live counts for each food module (Rezepte, Essenspläne, Einkaufslisten, Zutaten) fetched from the dashboard API. The counts SHALL appear inside the module tiles and not as separate count cards. The Essenspläne tile SHALL additionally show the number of active plans (`active_meal_plan_count`), and the Einkaufslisten tile the number of open lists (`open_shopping_list_count`); both come from the dashboard API (see `food-plan-summary-fields`).

#### Scenario: Homepage loads with statistics
- **WHEN** a user navigates to `/`
- **THEN** each of the four module tiles shows its current number from the API

#### Scenario: API loading state
- **WHEN** the dashboard API request is pending
- **THEN** the module tiles show their title and a skeleton in place of the number

### Requirement: Homepage displays module feature cards
The system SHALL display one tile per module (Rezepte, Essenspläne, Einkaufslisten, Zutaten) with an icon, a one-line description and a single navigation link covering the whole tile. The Norm-Portion-Simulator SHALL remain reachable from the homepage through a link.

#### Scenario: User clicks module card
- **WHEN** a user clicks on a module tile
- **THEN** the user is navigated to the corresponding module page

#### Scenario: Norm-Portion-Simulator card
- **WHEN** the homepage is displayed
- **THEN** a link to the Norm-Portion-Simulator leads to `/tools/norm-portion-simulator`

### Requirement: Homepage is mobile-first
The system SHALL render the homepage responsively with a single-column flow on mobile (320px+) and a multi-column layout on desktop. The module tiles SHALL stand in two columns on mobile and four columns from 1024 px.

#### Scenario: Mobile viewport
- **WHEN** the viewport is less than 768px wide
- **THEN** introduction, tiles, steps and popular recipes stack vertically and the tiles form two columns

#### Scenario: Desktop viewport
- **WHEN** the viewport is 1024px or wider
- **THEN** the introduction shows text and the continue-planning card side by side and the four tiles form one row

## ADDED Requirements

### Requirement: Homepage introduction with main actions
The homepage SHALL start with one H1, a short description and two actions: the primary action "Essensplan erstellen" and the secondary action "Rezepte entdecken". At most one sticker MAY appear in the introduction.

#### Scenario: Introduction
- **WHEN** an anonymous user opens `/`
- **THEN** he sees the H1, the description and both actions, and "Essensplan erstellen" leads to the meal plan creation or to login

### Requirement: Continue-planning card from existing data
For signed-in users with at least one upcoming or unfinished meal plan, the homepage SHALL show a card "Weiter planen" built only from fields of the meal plan list (name, period, persons, `filled_meals_count` of `meals_count`, the cost line from the plan's cost endpoint; it is omitted when prices are missing. The card SHALL link to the plan and SHALL NOT appear for anonymous users or users without plans.

#### Scenario: User with a plan
- **WHEN** a signed-in user with an upcoming plan opens `/`
- **THEN** the card shows the plan name, period, progress of planned meals as text and bar, and a link to the plan

#### Scenario: No plan
- **WHEN** a signed-in user without plans opens `/`
- **THEN** no card is shown and the primary action remains

### Requirement: Popular recipes and steps from existing data
The homepage SHALL show a short "So funktioniert’s" explanation in three steps and a row of popular recipes taken from the existing recipe list sorted by popularity. Both blocks MUST degrade silently: without data the recipe row is hidden.

#### Scenario: Popular recipes
- **WHEN** the recipe list returns items
- **THEN** a row of up to four recipe cards is shown with a link to all recipes

#### Scenario: No recipes
- **WHEN** the recipe list is empty or fails to load
- **THEN** the popular row is not rendered and the rest of the page is unaffected
