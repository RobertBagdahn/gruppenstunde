## ADDED Requirements

### Requirement: Food Dashboard API endpoint
The system SHALL provide a `GET /api/food/dashboard/` endpoint that returns aggregated statistics across all food modules without requiring authentication.

#### Scenario: Successful dashboard load
- **WHEN** any user (authenticated or anonymous) requests `GET /api/food/dashboard/`
- **THEN** the system returns HTTP 200 with counts for recipes, ingredients, meal plans, and shopping lists, plus insights object

#### Scenario: Empty database
- **WHEN** the database has no recipes, ingredients, meal plans, or shopping lists
- **THEN** all counts are 0 and insight fields that reference specific items are null

### Requirement: Homepage displays module statistics
The system SHALL display a homepage at route `/` showing live counts for each food module (Rezepte, Zutaten, Essenspläne, Einkaufslisten) fetched from the dashboard API.

#### Scenario: Homepage loads with statistics
- **WHEN** a user navigates to `/`
- **THEN** the page displays count cards for all four modules with current numbers from the API

#### Scenario: API loading state
- **WHEN** the dashboard API request is pending
- **THEN** the homepage displays skeleton placeholders for the count cards

### Requirement: Homepage displays module feature cards
The system SHALL display feature cards for each module (Rezepte, Zutaten, Essensplan, Einkaufslisten, Norm-Portion-Simulator) with description and navigation link.

#### Scenario: User clicks module card
- **WHEN** a user clicks on a module feature card
- **THEN** the user is navigated to the corresponding module page

#### Scenario: Norm-Portion-Simulator card
- **WHEN** the homepage is displayed
- **THEN** a card for the Norm-Portion-Simulator links to `/tools/norm-portion-simulator`

### Requirement: Homepage displays insights
The system SHALL display fun-fact insights from the API (most planned recipe, average ingredients per recipe, newest recipe, total meal days planned).

#### Scenario: Insights with data
- **WHEN** the API returns non-null insight values
- **THEN** the homepage displays them in a visually distinct section with links to referenced items

#### Scenario: Insights without data
- **WHEN** insight fields are null (e.g. no recipes exist)
- **THEN** the homepage hides those specific insight items gracefully

### Requirement: Homepage is mobile-first
The system SHALL render the homepage responsively with a single-column layout on mobile (320px+) and multi-column grid on desktop.

#### Scenario: Mobile viewport
- **WHEN** the viewport is less than 768px wide
- **THEN** stat cards, module cards, and insights stack vertically

#### Scenario: Desktop viewport
- **WHEN** the viewport is 768px or wider
- **THEN** stat cards display in a 4-column grid and module cards in a 2-column grid
