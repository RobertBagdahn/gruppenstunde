### Requirement: Meal plan list page
The system SHALL display a list of meal plans at `/meal-plans/app` showing all plans the user owns or collaborates on. Each list item SHALL show name, creation date, number of days/meals, and event name if linked.

#### Scenario: User views their meal plans
- **WHEN** an authenticated user navigates to `/meal-plans/app`
- **THEN** the system shows a list of meal plans (own + collaborator) with name, date, and meal count

#### Scenario: User creates a new meal plan
- **WHEN** the user clicks the create button
- **THEN** the system navigates to `/meal-plans/new`

#### Scenario: User opens a meal plan
- **WHEN** the user clicks a meal plan in the list
- **THEN** the system navigates to `/meal-plans/:id`

### Requirement: Meal plan creation page
The system SHALL provide a form at `/meal-plans/new` to create a new meal plan with name, description, norm portions, start date, and number of days.

#### Scenario: User creates a meal plan
- **WHEN** the user fills in name and submits
- **THEN** the system creates the plan and navigates to its detail page

#### Scenario: User cancels creation
- **WHEN** the user clicks cancel
- **THEN** the system navigates back to the list

### Requirement: Meal plan detail page
The system SHALL display a meal plan detail view at `/meal-plans/:id` with a day-based layout showing meals grouped by date, each meal showing its assigned recipes/ingredients.

#### Scenario: User views meal plan detail
- **WHEN** an authenticated user with access navigates to `/meal-plans/:id`
- **THEN** the system shows the plan name, days with meals, and items per meal

#### Scenario: User without access
- **WHEN** a user without access navigates to `/meal-plans/:id`
- **THEN** the system shows a 404 error

### Requirement: Meal plan editing
The system SHALL allow users with edit permission to add/remove days, add/remove meals, and add/remove recipe items.

#### Scenario: Editor adds a day
- **WHEN** a user with edit permission clicks "Tag hinzufügen" and selects a date
- **THEN** the system creates default meals for that date

#### Scenario: Editor adds a recipe to a meal
- **WHEN** a user with edit permission clicks "Rezept hinzufügen" on a meal
- **THEN** the system shows a recipe search dialog and adds the selected recipe

#### Scenario: Viewer cannot edit
- **WHEN** a user with viewer role views the detail page
- **THEN** edit buttons are not displayed

### Requirement: Collaborator management on detail page
The system SHALL show a collaborator section on the meal plan detail page allowing owners/admins to add, change role, and remove collaborators.

#### Scenario: Owner adds a collaborator
- **WHEN** the owner enters a username and selects a role
- **THEN** the collaborator is added and appears in the list

#### Scenario: Owner removes a collaborator
- **WHEN** the owner clicks remove on a collaborator
- **THEN** the collaborator is removed after confirmation

#### Scenario: Viewer cannot manage collaborators
- **WHEN** a viewer views the detail page
- **THEN** the collaborator management controls are not shown (only the list)

### Requirement: Route registration
The system SHALL register routes `/meal-plans/app`, `/meal-plans/new`, and `/meal-plans/:id` in `App.tsx`.

#### Scenario: Routes are accessible
- **WHEN** a user navigates to any of the meal plan routes
- **THEN** the correct page component renders
