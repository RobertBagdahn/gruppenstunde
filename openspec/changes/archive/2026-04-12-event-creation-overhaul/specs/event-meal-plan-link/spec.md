## ADDED Requirements

### Requirement: MealPlan foreign key on Event model
The Event model SHALL have an optional foreign key linking to a meal plan.

#### Scenario: meal_plan field definition
- **WHEN** the Event model is defined
- **THEN** it SHALL include a `meal_plan` field with the following properties:
  - ForeignKey to `"planner.MealEvent"` (Django string reference to avoid circular imports)
  - `null=True`, `blank=True`
  - `on_delete=models.SET_NULL`
  - `related_name="events"`

#### Scenario: Migration does not break existing events
- **WHEN** the migration for the `meal_plan` field is applied
- **THEN** all existing Event records SHALL have `meal_plan` set to `NULL`

### Requirement: Pydantic schema for meal plan link
The Event Pydantic schemas SHALL expose the meal plan association.

#### Scenario: meal_plan_id in EventIn schema
- **WHEN** the EventIn (input) schema is defined
- **THEN** it SHALL include `meal_plan_id` as `Optional[int]` with default `None`

#### Scenario: meal_plan in EventOut schema
- **WHEN** the EventOut (output) schema is defined
- **THEN** it SHALL include a nested `meal_plan` object with fields: `id` (int), `title` (str), `created_at` (datetime)
- **THEN** `meal_plan` SHALL be `None` when no meal plan is linked

### Requirement: Link meal plan via API
The existing Event PATCH endpoint SHALL support linking and unlinking a meal plan.

#### Scenario: Link a meal plan to an event
- **WHEN** PATCH `/api/events/{slug}/` with body `{meal_plan_id: 42}`
- **THEN** the Event's `meal_plan` field SHALL be set to the MealEvent with id 42
- **THEN** the response SHALL return 200 OK with the updated event data including the meal plan

#### Scenario: Unlink a meal plan from an event
- **WHEN** PATCH `/api/events/{slug}/` with body `{meal_plan_id: null}`
- **THEN** the Event's `meal_plan` field SHALL be set to `NULL`
- **THEN** the response SHALL return 200 OK

#### Scenario: Link to non-existent meal plan
- **WHEN** PATCH `/api/events/{slug}/` with a `meal_plan_id` that does not exist
- **THEN** the response SHALL return 404 Not Found with message "Essensplan nicht gefunden."

#### Scenario: Only managers can link meal plans
- **WHEN** a non-manager attempts to PATCH the event with a `meal_plan_id`
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Meal plan link UI in Settings tab
The Settings tab SHALL provide a control to link or unlink a meal plan.

#### Scenario: Link button when no meal plan is linked
- **WHEN** a manager views the Settings tab and no meal plan is linked
- **THEN** an "Essensplan verknüpfen" button SHALL be displayed

#### Scenario: Select existing meal plan
- **WHEN** a manager clicks "Essensplan verknüpfen"
- **THEN** a dialog SHALL open showing a list of existing MealEvents for selection
- **THEN** each item SHALL display the meal plan title and creation date

#### Scenario: Create new meal plan from dialog
- **WHEN** a manager opens the meal plan link dialog
- **THEN** a "Neuen Essensplan erstellen" option SHALL be available
- **THEN** selecting this option SHALL navigate to the meal plan creation page and return the user to link the newly created plan

#### Scenario: Unlink existing meal plan
- **WHEN** a manager views the Settings tab and a meal plan is already linked
- **THEN** the linked meal plan title SHALL be displayed with a "Verknüpfung entfernen" button
- **THEN** clicking the button SHALL set `meal_plan_id` to `null` via the PATCH endpoint

### Requirement: Meal plan summary in Overview tab
The Overview tab SHALL display a summary card when a meal plan is linked.

#### Scenario: Meal plan card display
- **WHEN** a manager views the Overview tab and a meal plan is linked
- **THEN** an "Essensplan" card SHALL be displayed showing the meal plan title

#### Scenario: Link to full meal plan page
- **WHEN** a manager views the meal plan card in the Overview tab
- **THEN** the card SHALL contain a link to `/planning/meal-plans/{id}` opening the full meal plan detail page

#### Scenario: No meal plan card when unlinked
- **WHEN** a manager views the Overview tab and no meal plan is linked
- **THEN** the "Essensplan" card SHALL NOT be displayed
