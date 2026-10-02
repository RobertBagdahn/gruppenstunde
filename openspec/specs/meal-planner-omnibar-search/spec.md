# meal-planner-omnibar-search Specification

## Purpose
TBD - created by archiving change redesign-meal-planner-ux. Update Purpose after archive.
## Requirements
### Requirement: Central Omnibar Search Modal
The system SHALL provide a unified Omnibar dialog (`MealOmnibarDialog`) accessible via keyboard shortcut (Cmd/Ctrl+K) or the "+ Gericht hinzufügen" button on any meal slot. A meal plan page SHALL render at most one Omnibar dialog instance. The keyboard shortcut SHALL open the dialog for the most recently active meal (last opened, expanded or clicked slot) and otherwise for the first meal of the first day. The dialog header SHALL name the target meal, e.g. „Hinzufügen zu: Abendessen · Fr., 11.12.“. Opening the dialog SHALL reset the query and the filter pill to `Alle`.

#### Scenario: Opening omnibar from meal slot
- **WHEN** user clicks "+ Gericht hinzufügen" on an empty or existing meal slot
- **THEN** Omnibar search modal opens with auto-focused search input ready for typing

#### Scenario: Keyboard shortcut opens exactly one dialog
- **GIVEN** a signed-in editor views a plan with 7 meals in the day view
- **WHEN** the user presses Cmd+K
- **THEN** exactly one Omnibar dialog SHALL be open

#### Scenario: Shortcut targets the last active meal
- **GIVEN** the user expanded the dinner slot of Friday
- **WHEN** the user presses Cmd+K and selects a recipe
- **THEN** the recipe SHALL be added to Friday's dinner and the dialog SHALL close with no other dialog remaining

#### Scenario: Viewer without edit permission
- **GIVEN** a user who can view but not edit the plan (`can_edit=false`)
- **WHEN** the user presses Cmd+K
- **THEN** no Omnibar dialog SHALL open

### Requirement: Unified Search with Filter Pills
The Omnibar search SHALL query recipes and single ingredients concurrently, allowing instant narrowing via filter pills: `[ Alle ]`, `[ Rezepte ]` and `[ Zutaten ]`. Placeholder sets or bundles without a backend source SHALL NOT be shown. In `Alle`, results SHALL be grouped under the headings „Rezepte“ and „Zutaten“ with at most 5 entries each, each group followed by „Alle anzeigen“ which switches to the corresponding pill.

#### Scenario: Alle shows both groups
- **WHEN** the search returns 25 recipes and 25 ingredients and the pill `Alle` is active
- **THEN** the list SHALL show 5 recipes under „Rezepte“ and 5 ingredients under „Zutaten“

#### Scenario: Filtering search results by category
- **WHEN** user types "Hafer" and clicks the filter pill "Zutaten"
- **THEN** search results update immediately to display matching ingredients, hiding full recipes

#### Scenario: No placeholder sets
- **WHEN** the Omnibar opens for a breakfast slot
- **THEN** no entry „Klassisches Lager-Frühstück (Set)“ or pill „Sets & Bundles“ SHALL be shown

### Requirement: Live Preview and Direct Portion Adding
Selecting an item in the search results list SHALL render a side-by-side preview panel showing preparation time, cost for the plan's current portion count, and an "Übernehmen"-action.

#### Scenario: Adding a recipe with current plan servings
- **WHEN** user selects a recipe and clicks "Mahlzeit hinzufügen (25 P.)"
- **THEN** recipe is assigned to the active meal slot scaled to 25 portions and the dialog closes

### Requirement: Selected ingredient portion is persisted
When the user adds a single ingredient via the Omnibar, the system SHALL persist the chosen portion on the meal item (`MealItem.portion`). All views — day plan, table, cooking plan and shopping list — SHALL compute the item's weight as `quantity × trusted portion weight` for items with a portion. Items without a portion SHALL keep the existing semantics (unit Gramm or ml = direct amount per person).

#### Scenario: Toastbrot slice
- **GIVEN** a plan with 12 persons and reserve factor 1.1, and "Toastbrot" with the rank-1 portion "Scheibe" (30 g) and a "g" portion (1 g), both with unit Gramm
- **WHEN** the user adds "Toastbrot" via the Omnibar with the default 1 × "Scheibe" per person
- **THEN** the day plan and table SHALL show „1 Scheibe / P. (30 g)“
- **AND** the energy SHALL be computed from 30 g per person
- **AND** the shopping list SHALL show 396 g Toastbrot (30 g × 12 × 1.1)

#### Scenario: Portion of another ingredient
- **WHEN** a client sends `POST /api/meal-plans/{id}/meals/{meal_id}/items/` with `ingredient_id` of "Toastbrot" and a `portion_id` belonging to "Zimt"
- **THEN** the API SHALL respond with HTTP 422 „Die Portion gehört nicht zu dieser Zutat“

#### Scenario: Anonymous request
- **WHEN** a non-authenticated client sends `POST /api/meal-plans/{id}/meals/{meal_id}/items/`
- **THEN** the API SHALL respond with HTTP 401 or 403 and SHALL NOT create an item
