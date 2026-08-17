## MODIFIED Requirements

### Requirement: Meal plan detail page
The system SHALL display a meal plan detail view at `/meal-plans/:id` with a day-based layout showing meals grouped by date, each meal showing its assigned recipes/ingredients. The detail view MUST include a nutrition tab that supports filtering nutrition data by either the entire plan (default) or a specific day using a horizontal day-by-day (Bar7-style) selector and a leading "Gesamt" button. All nutritional metrics in this view SHALL be visualized using relative `SollIstBar` indicators displaying current value against calculated limits where rules are configured.

#### Scenario: User views meal plan detail
- **WHEN** an authenticated user with access navigates to `/meal-plans/:id`
- **THEN** the system shows the plan name, days with meals, and items per meal

#### Scenario: User without access
- **WHEN** a user without access navigates to `/meal-plans/:id`
- **THEN** the system shows a 404 error

#### Scenario: User filters nutrition by day
- **WHEN** the user selects a specific day from the horizontal day selector in the nutrition tab
- **THEN** the system fetches and displays nutrition totals specifically aggregated for that day
