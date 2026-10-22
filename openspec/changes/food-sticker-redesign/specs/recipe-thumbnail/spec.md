# Spec Delta

## MODIFIED Requirements

### Requirement: Shared RecipeThumbnail component
The Food-Frontend (`frontend-food/`) SHALL provide a shared `<RecipeThumbnail>` component at `frontend-food/src/components/recipe/RecipeThumbnail.tsx` that all recipe-image-rendering locations MUST use instead of inline `<img>` markup.

#### Scenario: Component renders with a valid image URL
- **WHEN** `RecipeThumbnail` is rendered with a non-null `imageUrl` prop
- **THEN** the component SHALL display the image with `object-cover`
- **THEN** the `<img>` element SHALL have an `alt` attribute set to the `title` prop

#### Scenario: Component renders fallback when image is missing
- **WHEN** `RecipeThumbnail` is rendered with `imageUrl` set to `null`, `undefined`, or an empty string
- **THEN** the component SHALL display a surface in the category tint of the recipe type with its Lucide symbol (Sand für Rezeptteil, Rosa für Getränk, usw.)
- **THEN** a recipe without a type SHALL display a neutral `bg-muted` surface with the `UtensilsCrossed` symbol and no `<img>` element

### Requirement: RecipeThumbnail replaces duplicated fallback logic
`RecipeCard`, `RecipeTableRow`, `IntelligentSuggestionsGrid` (SuggestionCard), `IngredientDetailPage.RecipesSection`, `MealSlot`, `RecipePreviewInline`, `RecipePreviewDialog`, `ProfilePage`, and `RecipeImportPage` SHALL render recipe images exclusively through `RecipeThumbnail`, without any duplicated inline `<img src={x || fallback}>` or icon-fallback markup.

#### Scenario: No inline fallback markup remains
- **WHEN** a developer inspects any of the listed components after this change
- **THEN** none of them SHALL contain inline `<img src={... || '/images/inspi_cook.png'}>` or Lucide-icon-based image fallback markup
- **THEN** each SHALL instead render `<RecipeThumbnail .../>`

#### Scenario: Every previously fallback-less location now has a fallback
- **WHEN** a recipe without an image is rendered in `MealSlot`, `RecipePreviewInline`, `RecipePreviewDialog`, `ProfilePage`, or `RecipeImportPage`
- **THEN** the category-tinted fallback surface of `RecipeThumbnail` SHALL be displayed instead of no image element at all
