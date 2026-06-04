## ADDED Requirements

### Requirement: Shared meal actions menu
A single reusable meal actions menu component (`MealActionsMenu`) SHALL be provided and embedded identically in both the Tagesplan (`MealSlot`) and the Tabelle (`TableView`). The menu SHALL expose the following actions for an editable meal: Portionen ändern (`override_portions`), Extern essen (`is_external` + price/calories), Auf Soll skalieren, Soll ändern (`day_part_factor`), Notiz (`note`), RefMeal verknüpfen/entkoppeln, Items kopieren, Mahlzeit löschen.

#### Scenario: Same actions available in both views
- **WHEN** an editable meal is rendered in either the Tagesplan or the Tabelle
- **THEN** the meal actions menu SHALL offer the identical set of actions

#### Scenario: Menu hidden when not editable
- **WHEN** the meal plan is not editable by the current user (`can_edit=false`)
- **THEN** the meal actions menu SHALL NOT be shown

### Requirement: Edit portions override via menu
The menu SHALL allow setting or clearing the meal's `override_portions`. Clearing it SHALL fall back to the plan's `norm_portions`.

#### Scenario: Set override portions
- **WHEN** a user enters `22` for Portionen on a meal
- **THEN** the meal's `override_portions` SHALL be set to 22 and used for that meal's scaling and cost

#### Scenario: Clear override portions
- **WHEN** a user clears the Portionen value
- **THEN** `override_portions` SHALL become null and the plan's `norm_portions` SHALL apply

### Requirement: Edit note via menu
The menu SHALL allow editing a meal's `note` from both views (closing the parity gap where only the Tabelle could edit notes).

#### Scenario: Edit note from Tagesplan
- **WHEN** a user opens the menu in the Tagesplan and edits the note
- **THEN** the meal's `note` SHALL be updated and visible in both views

### Requirement: Edit day-part factor (Soll) via menu
The menu SHALL allow editing a meal's `day_part_factor` (Soll percentage) from both views.

#### Scenario: Change Soll
- **WHEN** a user sets the Soll of a meal to 0.40
- **THEN** the meal's `day_part_factor` SHALL be 0.40 and the displayed Soll percentage SHALL update accordingly
