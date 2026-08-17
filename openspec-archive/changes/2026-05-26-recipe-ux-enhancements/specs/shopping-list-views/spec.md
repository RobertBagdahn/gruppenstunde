## ADDED Requirements

### Requirement: Shopping List View Modes
The system SHALL support three view modes on GET /api/shopping-lists/{id}/items/ via query parameter ?view=detailed|summarized|by_recipe.

#### Scenario: Detailed view (default)
- **WHEN** a client requests items without a view parameter or with ?view=detailed
- **THEN** the system SHALL return items individually as currently implemented

#### Scenario: Summarized view
- **WHEN** a client requests items with ?view=summarized
- **THEN** the system SHALL group items by ingredient, sum quantities (applying unit conversion where needed), and return one entry per ingredient

#### Scenario: By-recipe view
- **WHEN** a client requests items with ?view=by_recipe
- **THEN** the system SHALL group items by their source recipe and return items nested under each recipe

### Requirement: Print View
The frontend SHALL provide a print-optimized view for shopping lists using CSS @media print rules.

#### Scenario: Print button triggers print
- **WHEN** a user clicks the print button on a shopping list
- **THEN** the browser SHALL open the print dialog with a clean layout containing checkboxes, category headers, and no navigation elements

#### Scenario: Print layout structure
- **WHEN** the print view is rendered
- **THEN** it SHALL display items grouped by category/retail_section with checkbox inputs and clean typography
