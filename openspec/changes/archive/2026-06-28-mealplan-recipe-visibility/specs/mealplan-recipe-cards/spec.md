## ADDED Requirements

### Requirement: Recipe cards in meal plan day view
The system SHALL render each meal item (recipe, ingredient, variant group) in the meal plan day view as a visually distinct card with a colored background corresponding to the meal type.

#### Scenario: Recipe item displayed in colored card
- **WHEN** a meal plan day view displays a meal slot containing recipe items
- **THEN** each recipe item SHALL be rendered inside a box with `rounded-lg` corners, padding, and a background color matching the meal type (breakfast=orange, lunch=cyan, dinner=indigo, snack=amber)

#### Scenario: Ingredient item displayed in same card style
- **WHEN** a meal plan day view displays a meal slot containing an ingredient item (no recipe_id)
- **THEN** the ingredient item SHALL be rendered in the same colored card style as recipe items

#### Scenario: Variant group displayed as single card
- **WHEN** a meal plan day view displays a variant group (items sharing a variant_group_id)
- **THEN** all variants in the group SHALL be rendered inside a single shared card with the recipe header and indented variant children

#### Scenario: Empty meal state unchanged
- **WHEN** a meal slot has no items (empty state)
- **THEN** the empty state UI (search CTA buttons, random suggestion, breakfast wizard) SHALL remain visually unchanged without colored cards

#### Scenario: Colored border on recipe cards
- **WHEN** a recipe card is rendered
- **THEN** the card SHALL have a subtle colored border (`border` with meal-type color at reduced opacity) in addition to the background color

#### Scenario: Mobile layout preserved
- **WHEN** the viewport width is 320px
- **THEN** recipe cards SHALL not overflow or break the layout, and SHALL remain fully functional with image, title, metadata, factor input, and delete button visible

#### Scenario: Delete button interaction preserved
- **WHEN** a user hovers over a recipe card
- **THEN** the delete button SHALL appear via hover opacity transition, matching the existing interaction pattern
