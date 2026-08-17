## ADDED Requirements

### Requirement: Shared RecipeThumbnail component
The Food-Frontend (`frontend-food/`) SHALL provide a shared `<RecipeThumbnail>` component at `frontend-food/src/components/recipe/RecipeThumbnail.tsx` that all recipe-image-rendering locations MUST use instead of inline `<img>` markup.

#### Scenario: Component renders with a valid image URL
- **WHEN** `RecipeThumbnail` is rendered with a non-null `imageUrl` prop
- **THEN** the component SHALL display the image with `object-cover`
- **THEN** the `<img>` element SHALL have an `alt` attribute set to the `title` prop

#### Scenario: Component renders fallback when image is missing
- **WHEN** `RecipeThumbnail` is rendered with `imageUrl` set to `null`, `undefined`, or an empty string
- **THEN** the component SHALL display the placeholder image `/images/inspi_cook.png`
- **THEN** the placeholder SHALL be rendered with `object-contain`, padding, and a muted background (`bg-muted/30`), matching the existing Inspi-fallback convention

### Requirement: RecipeThumbnail size variants
`RecipeThumbnail` SHALL support a `size` prop with the values `xs`, `sm`, `md`, `lg`, and `full`, mapping to the existing Tailwind dimension classes already used across the Food-Frontend.

#### Scenario: xs size matches MealSlot thumbnail
- **WHEN** `RecipeThumbnail` is rendered with `size="xs"`
- **THEN** the container SHALL use `w-10 h-10` with `object-cover rounded`

#### Scenario: sm size matches RecipeTableRow/ProfilePage thumbnail
- **WHEN** `RecipeThumbnail` is rendered with `size="sm"`
- **THEN** the container SHALL use dimensions consistent with `RecipeTableRow` (`w-12 h-12`) or `ProfilePage` (`w-16 h-16`) depending on an additional size token

#### Scenario: md size matches RecipeCard aspect-square
- **WHEN** `RecipeThumbnail` is rendered with `size="md"`
- **THEN** the container SHALL use `aspect-square` matching `RecipeCard`'s existing grid image behavior

#### Scenario: full size matches preview dialogs
- **WHEN** `RecipeThumbnail` is rendered with `size="full"`
- **THEN** the container SHALL use `w-full` with a `max-h` constraint matching `RecipePreviewInline`/`RecipePreviewDialog` (`max-h-[200px]`/`max-h-64`)

### Requirement: RecipeThumbnail aspect ratio variants
`RecipeThumbnail` SHALL support an `aspectRatio` prop with values `square`, `16/9`, and `4/3` to match the differing grid layouts already present in the Food-Frontend (e.g., `aspect-[16/9]` used on the ingredient recipe grid, `aspect-[4/3]` used in `IntelligentSuggestionsGrid`).

#### Scenario: Default aspect ratio is square
- **WHEN** `RecipeThumbnail` is rendered without an explicit `aspectRatio` prop
- **THEN** it SHALL default to `square`

#### Scenario: Explicit 16:9 aspect ratio
- **WHEN** `RecipeThumbnail` is rendered with `aspectRatio="16/9"`
- **THEN** the image container SHALL use `aspect-[16/9]`

### Requirement: RecipeThumbnail lazy loading control
`RecipeThumbnail` SHALL default to `loading="lazy"` and SHALL support an `eager` boolean prop to opt out for above-the-fold usage.

#### Scenario: Default lazy loading
- **WHEN** `RecipeThumbnail` is rendered without the `eager` prop
- **THEN** the underlying `<img>` element SHALL have `loading="lazy"`

#### Scenario: Eager loading for above-the-fold images
- **WHEN** `RecipeThumbnail` is rendered with `eager={true}`
- **THEN** the underlying `<img>` element SHALL NOT have a `loading="lazy"` attribute

### Requirement: RecipeThumbnail replaces duplicated fallback logic
`RecipeCard`, `RecipeTableRow`, `IntelligentSuggestionsGrid` (SuggestionCard), `IngredientDetailPage.RecipesSection`, `MealSlot`, `RecipePreviewInline`, `RecipePreviewDialog`, `ProfilePage`, and `RecipeImportPage` SHALL render recipe images exclusively through `RecipeThumbnail`, without any duplicated inline `<img src={x || fallback}>` or icon-fallback markup.

#### Scenario: No inline fallback markup remains
- **WHEN** a developer inspects any of the listed components after this change
- **THEN** none of them SHALL contain inline `<img src={... || '/images/inspi_cook.png'}>` or Lucide-icon-based image fallback markup
- **THEN** each SHALL instead render `<RecipeThumbnail .../>`

#### Scenario: Every previously fallback-less location now has a fallback
- **WHEN** a recipe without an image is rendered in `MealSlot`, `RecipePreviewInline`, `RecipePreviewDialog`, `ProfilePage`, or `RecipeImportPage`
- **THEN** the placeholder image `/images/inspi_cook.png` SHALL be displayed instead of no image element at all
</content>
