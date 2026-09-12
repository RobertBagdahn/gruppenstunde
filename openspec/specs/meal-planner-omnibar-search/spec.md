# meal-planner-omnibar-search Specification

## Purpose
TBD - created by archiving change redesign-meal-planner-ux. Update Purpose after archive.
## Requirements
### Requirement: Central Omnibar Search Modal
The system SHALL provide a unified Omnibar dialog (`MealOmnibarDialog`) accessible via keyboard shortcut (Cmd/Ctrl+K) or the "+ Gericht hinzufügen" button on any meal slot.

#### Scenario: Opening omnibar from meal slot
- **WHEN** user clicks "+ Gericht hinzufügen" on an empty or existing meal slot
- **THEN** Omnibar search modal opens with auto-focused search input ready for typing

### Requirement: Unified Search with Filter Pills
The Omnibar search SHALL query recipes, single ingredients, and template meal bundles concurrently, allowing instant narrowing via filter pills: `[ Alle ]`, `[ Rezepte ]`, `[ Zutaten ]`, and `[ Vorlagen/Sets ]`.

#### Scenario: Filtering search results by category
- **WHEN** user types "Hafer" and clicks the filter pill "Zutaten"
- **THEN** search results update immediately to display matching ingredients, hiding full recipes

### Requirement: Live Preview and Direct Portion Adding
Selecting an item in the search results list SHALL render a side-by-side preview panel showing preparation time, cost for the plan's current portion count, and an "Übernehmen"-action.

#### Scenario: Adding a recipe with current plan servings
- **WHEN** user selects a recipe and clicks "Mahlzeit hinzufügen (25 P.)"
- **THEN** recipe is assigned to the active meal slot scaled to 25 portions and the dialog closes
