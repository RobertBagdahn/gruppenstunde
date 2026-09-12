# meal-planner-workflow-navigation Specification

## Purpose
TBD - created by archiving change redesign-meal-planner-ux. Update Purpose after archive.
## Requirements
### Requirement: 3-Pillar Main Navigation
The meal plan detail page SHALL provide exactly three primary navigation tabs: "Planen" (`/plan`), "Einkaufen" (`/shopping`), and "Kochen" (`/cooking`).

#### Scenario: Switching between the three main areas
- **WHEN** user clicks on "Einkaufen" in the main navigation
- **THEN** system navigates to `/meal-plans/{id}/shopping` and displays shopping lists and cost overview
- **WHEN** user clicks on "Kochen"
- **THEN** system navigates to `/meal-plans/{id}/cooking` and displays cooking schedule and kitchen helper views

### Requirement: View Switcher in Planning Tab
The "Planen" tab SHALL provide a header switch allowing users to toggle seamlessly between the Day Plan cards view and the Table view.

#### Scenario: Switching to table view within planning
- **WHEN** user activates the "Tabelle" option in the planning header switch
- **THEN** system renders the tabular meal overview while staying within the "Planen" section

### Requirement: Sub-Navigation in Shopping and Cooking Tabs
The "Einkaufen" tab SHALL offer sub-tabs for "Einkaufsliste" and "Kosten & Budget". The "Kochen" tab SHALL offer sub-views for "Zubereitungs-Zeitplan" and "Küchenhelfer & Allergene".

#### Scenario: Switching between shopping list and budget
- **WHEN** user is in the "Einkaufen" tab and selects the "Kosten & Budget" sub-tab
- **THEN** system displays the budget cockpit, target-actual comparisons, and cost distributions without changing the top-level tab
