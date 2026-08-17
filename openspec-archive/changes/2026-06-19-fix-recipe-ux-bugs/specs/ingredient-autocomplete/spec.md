## ADDED Requirements

### Requirement: Portion selection after ingredient choice
When a user selects an ingredient in the recipe creation flow, the system SHALL prompt them to choose a specific portion before the ingredient can be saved.

#### Scenario: Portion dropdown appears after ingredient selection
- **WHEN** user selects an ingredient from the autocomplete in CreateRecipePage
- **THEN** the system SHALL fetch the ingredient's portions via GET /api/ingredients/{slug}/portions/
- **THEN** a portion dropdown SHALL appear next to the ingredient name
- **THEN** the ingredient SHALL NOT be savable until a portion is selected (portion_id must be non-null)

#### Scenario: Default portion pre-selected
- **WHEN** portions are loaded for a selected ingredient
- **THEN** the portion marked is_default SHALL be pre-selected in the dropdown

### Requirement: Ingredient creation in UnknownIngredientDialog
When a user types an unknown ingredient name and clicks "Neu anlegen" in the UnknownIngredientDialog, the system SHALL create the ingredient and provide its data back to the caller.

#### Scenario: Successful creation
- **WHEN** user clicks "Neu anlegen" for an unknown ingredient name
- **THEN** the system SHALL call POST /api/ingredients/ to create a draft ingredient
- **THEN** the dialog SHALL call onSelect with the new ingredient's id, name, and slug
- **THEN** the dialog SHALL close

## MODIFIED Requirements

### Requirement: API_BASE_URL usage in autocomplete components
All autocomplete and suggestion components in the Food Frontend SHALL use the configured API_BASE_URL (from import.meta.env.VITE_API_URL) instead of hardcoded relative /api/ paths.

#### Scenario: IngredientAutocomplete uses configured base URL
- **WHEN** IngredientAutocomplete fetches suggestions
- **THEN** the request URL SHALL be `${API_BASE_URL}/api/ingredients/?name=...` not `/api/ingredients/?name=...`

#### Scenario: UnknownIngredientDialog uses configured base URL
- **WHEN** UnknownIngredientDialog fetches suggestions
- **THEN** the request URL SHALL be `${API_BASE_URL}/api/ingredients/suggest/?q=...` not `/api/ingredients/suggest/?q=...`

#### Scenario: InlineIngredientEditor portion fetch uses configured base URL
- **WHEN** InlineIngredientEditor fetches portions for a selected ingredient
- **THEN** the request URL SHALL be `${API_BASE_URL}/api/ingredients/{slug}/portions/` not `/api/ingredients/{slug}/portions/`
