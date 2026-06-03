# meal-plan-frontend Specification

## Purpose
Defines requirements for the meal planning frontend.
## Requirements
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

### Requirement: Meal plan editing
The system SHALL allow users with edit permission to add/remove days, add/remove meals, and add/remove recipe items.

#### Scenario: Editor adds a day via date picker
- **WHEN** a user with edit permission clicks "Tag hinzufügen" and selects a date
- **THEN** the system creates default meals for that date

#### Scenario: Editor adds a day before existing days
- **WHEN** a user with edit permission clicks "Tag davor hinzufügen"
- **THEN** the system creates default meals for the date one day before the first existing day

#### Scenario: Editor adds a day after existing days
- **WHEN** a user with edit permission clicks "Tag danach hinzufügen"
- **THEN** the system creates default meals for the date one day after the last existing day

#### Scenario: Quick-add buttons visibility
- **WHEN** no days exist in the plan
- **THEN** the "Tag davor" and "Tag danach" buttons are not shown

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

<!-- Added by ref-meal-sync -->

### Requirement: Verknüpfungs-Status in Planübersicht
Die Meal-Plan-Übersicht SHALL für jedes Meal visuell anzeigen, ob es mit einem RefMeal verknüpft ist (z.B. Link-Icon), entkoppelt ist, oder kein RefMeal für seinen Typ existiert.

#### Scenario: Verknüpftes Meal anzeigen
- **WHEN** ein Meal `is_synced=True` und `ref_meal` gesetzt hat
- **THEN** wird ein Verknüpfungs-Icon (🔗) neben dem Meal angezeigt

#### Scenario: Entkoppeltes Meal anzeigen
- **WHEN** ein Meal `is_synced=False` hat (mit oder ohne ref_meal)
- **THEN** wird kein Verknüpfungs-Icon angezeigt und das Meal erscheint als eigenständig

### Requirement: Sync-Dialog bei Änderung
Die UI SHALL beim Bearbeiten eines konkreten Meals (das einen RefMeal-Typ hat) fragen, ob die Änderung nur für dieses Meal oder für alle (via RefMeal-Update + Sync) übernommen werden soll.

#### Scenario: Änderung mit Sync-Option
- **WHEN** User ein verknüpftes Frühstücks-Meal bearbeitet und speichert
- **THEN** wird ein Dialog angezeigt: "Nur dieses Frühstück" oder "Alle Frühstücke (RefMeal aktualisieren)"

#### Scenario: Nur dieses Meal ändern
- **WHEN** User "Nur dieses Frühstück" wählt
- **THEN** wird das Meal entkoppelt (`is_synced=False`) und die Änderung nur lokal gespeichert

#### Scenario: Alle via RefMeal ändern
- **WHEN** User "Alle Frühstücke" wählt
- **THEN** wird das RefMeal mit den neuen Items aktualisiert und auf alle verknüpften Meals synchronisiert

### Requirement: RefMeal-Editor erreichbar aus Planübersicht
Die Planübersicht SHALL einen Button/Link zum RefMeal-Editor für jeden vorhandenen meal_type bereitstellen.

#### Scenario: RefMeal-Editor öffnen
- **WHEN** User auf "RefMeal bearbeiten" für Frühstück klickt
- **THEN** wird der RefMeal-Editor für das Frühstücks-RefMeal des Plans geöffnet

