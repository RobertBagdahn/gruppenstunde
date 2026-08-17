## ADDED Requirements

### Requirement: Recipe titles display on up to two lines in card view

The `RecipeCard` component SHALL display recipe titles using `line-clamp-2` instead of `truncate`, allowing titles to wrap onto a second line before being cut off with an ellipsis.

#### Scenario: Short title fits in one line
- **WHEN** a recipe title is 20 characters or fewer
- **THEN** the title is displayed on a single line without truncation

#### Scenario: Medium title wraps to two lines
- **WHEN** a recipe title is between 21 and 30 characters
- **THEN** the title wraps naturally onto two lines and is fully visible

#### Scenario: Long title is clamped after two lines
- **WHEN** a recipe title exceeds ~30 characters
- **THEN** the title is displayed on two lines with "…" at the end of the second line

### Requirement: Recipe titles display on up to two lines in table view

The `RecipeTableRow` component SHALL display recipe titles using `line-clamp-2` instead of `truncate`, consistent with the card view.

#### Scenario: Title wraps in table row
- **WHEN** a recipe title is too long for a single line in the table view
- **THEN** the title wraps to a second line with "…" if still too long

### Requirement: Search dropdown titles remain single-line

The `RecipeSearchCard` component SHALL continue to use `truncate` for recipe titles in the compact search dropdown.

#### Scenario: Search result title stays truncated
- **WHEN** a recipe appears in the search results dropdown
- **THEN** the title is displayed on a single line with "…" if too long
