## MODIFIED Requirements

### Requirement: PackingItem optional Supply reference
PackingItem SHALL optionally reference a Supply (Material or Ingredient) via ContentType-based FK. When linked, the item SHALL inherit name, description, and price from the Supply.

#### Scenario: Packing item linked to Material
- **WHEN** a PackingItem references a Material
- **THEN** the item name SHALL default to the Material name
- **THEN** a link to the Material detail page SHALL be displayed
- **THEN** the Material's price and purchase links SHALL be accessible from the item

#### Scenario: Packing item linked to Ingredient
- **WHEN** a PackingItem references an Ingredient
- **THEN** the item name SHALL default to the Ingredient name
- **THEN** a link to the Ingredient detail page SHALL be displayed

#### Scenario: Packing item without Supply link
- **WHEN** a PackingItem has no Supply reference (content_type=null)
- **THEN** the item SHALL behave as a plain text item (current behavior preserved)

### Requirement: Supply search in packing list
When adding items to a packing list, the system SHALL provide a search that queries the Supply database (Materials and Ingredients).

#### Scenario: Searching for supply in packing list
- **WHEN** a user adds an item and types in the item name field
- **THEN** the system SHALL show autocomplete suggestions from the Supply database
- **THEN** selecting a suggestion SHALL link the PackingItem to the Supply entry
- **THEN** not selecting a suggestion SHALL create a plain text item
