## ADDED Requirements

### Requirement: Recipes-with-ingredient section reuses RecipeCard
On `IngredientDetailPage`, the "Rezepte mit dieser Zutat" section (`RecipesSection`) SHALL render each recipe using the shared `RecipeCard` component instead of a bespoke minimal card, and SHALL display recipe images (or the shared fallback) consistently with the rest of the recipe list pages.

#### Scenario: Recipe with an image is displayed
- **WHEN** the "Rezepte mit dieser Zutat" section renders a recipe that has an uploaded image
- **THEN** the recipe SHALL be displayed via `RecipeCard`, showing the recipe's image with `object-cover`

#### Scenario: Recipe without an image shows the shared fallback
- **WHEN** the "Rezepte mit dieser Zutat" section renders a recipe without an image
- **THEN** `RecipeCard` SHALL display the placeholder image `/images/inspi_cook.png` (via `RecipeThumbnail`), not an icon-only fallback

#### Scenario: Section retains existing empty and loading states
- **WHEN** no recipes reference the ingredient, or the recipes are still loading
- **THEN** the existing empty-state message ("Noch kein Rezept mit dieser Zutat") and loading skeleton SHALL continue to be displayed unchanged

#### Scenario: Mobile layout remains usable at 320px
- **WHEN** the "Rezepte mit dieser Zutat" section is rendered on a 320px-wide viewport
- **THEN** the `RecipeCard` grid SHALL remain legible and MUST NOT overflow horizontally, adjusting the number of grid columns if needed
</content>
