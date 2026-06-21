## ADDED Requirements

### Requirement: Recipe preview dialog

The system SHALL display a RecipePreviewDialog when the user clicks on a recipe in the RecipeSearchDialog, showing key recipe information before confirming addition. The dialog SHALL use `RecipeSearchResult` type fields and SHALL NOT reference `portions` or `servings` fields that are absent from the type.

#### Scenario: User clicks recipe in search results
- **WHEN** user clicks a recipe in the RecipeSearchDialog list
- **THEN** a RecipePreviewDialog SHALL open showing: image, title, recipe_type, energy per 100g (`cached_energy_kcal`), protein/fat/carbs per 100g, price per serving (`price_per_serving`), nutritional tags, and badge

#### Scenario: Energy display for recipe without servings
- **WHEN** a recipe's `RecipeSearchResult` has `cached_energy_kcal` but no `portions` field
- **THEN** energy SHALL be displayed per 100g (e.g. "X kcal/100g") instead of per serving

#### Scenario: User clicks "Hinzufügen" in preview
- **WHEN** user clicks the "Hinzufügen" button in the RecipePreviewDialog
- **THEN** the recipe SHALL be added to the meal, both dialogs SHALL close, and a toast SHALL appear

#### Scenario: Recipe without optional fields
- **WHEN** a recipe has no image, no price, or no nutritional data
- **THEN** those fields SHALL be gracefully hidden (not show "0" or placeholder)

### Requirement: Ingredients preview in search response

The recipe search response SHALL include an `ingredients_preview` field containing up to 8 ingredient names for each recipe result. The `RecipeSearchResultSchema` SHALL include `ingredients_preview: z.array(z.string()).optional()`.

#### Scenario: Recipe with 10 ingredients
- **WHEN** a recipe has 10 RecipeItems
- **THEN** `ingredients_preview` SHALL contain the first 8 ingredient names

#### Scenario: Recipe with 3 ingredients
- **WHEN** a recipe has 3 RecipeItems
- **THEN** `ingredients_preview` SHALL contain all 3 ingredient names
