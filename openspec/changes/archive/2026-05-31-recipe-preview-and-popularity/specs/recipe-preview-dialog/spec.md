## ADDED Requirements

### Requirement: Recipe preview dialog
The system SHALL display a RecipePreviewDialog when the user clicks on a recipe in the RecipeSearchDialog, showing key recipe information before confirming addition.

#### Scenario: User clicks recipe in search results
- **WHEN** user clicks a recipe in the RecipeSearchDialog list
- **THEN** a RecipePreviewDialog SHALL open showing: image, title, recipe_type, servings, energy per portion, protein/fat/carbs per portion, price per portion, Nutri-Score, nutritional tags, and ingredients list (first 8 ingredient names)

#### Scenario: User clicks "Hinzufügen" in preview
- **WHEN** user clicks the "Hinzufügen" button in the RecipePreviewDialog
- **THEN** the recipe SHALL be added to the meal, both dialogs SHALL close, and a toast "✓ {Rezeptname} hinzugefügt" SHALL appear

#### Scenario: User clicks "Abbrechen" in preview
- **WHEN** user clicks "Abbrechen" in the RecipePreviewDialog
- **THEN** the preview dialog SHALL close and the user SHALL return to the RecipeSearchDialog

#### Scenario: Recipe without optional fields
- **WHEN** a recipe has no image, no price, or no nutritional data
- **THEN** those fields SHALL be gracefully hidden (not show "0" or placeholder)

### Requirement: Ingredients preview in search response
The recipe search response SHALL include an `ingredients_preview` field containing up to 8 ingredient names for each recipe result.

#### Scenario: Recipe with 10 ingredients
- **WHEN** a recipe has 10 RecipeItems
- **THEN** `ingredients_preview` SHALL contain the first 8 ingredient names (sorted by RecipeItem.sort_order)

#### Scenario: Recipe with 3 ingredients
- **WHEN** a recipe has 3 RecipeItems
- **THEN** `ingredients_preview` SHALL contain all 3 ingredient names
