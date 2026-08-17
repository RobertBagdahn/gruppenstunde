## MODIFIED Requirements

### Requirement: Abstract Supply Base Class
The system SHALL provide an abstract Django model `Supply` as the base class for Material and Ingredient. The abstract model SHALL include: name (CharField, max 255), slug (SlugField, unique per table), description (TextField, Markdown), image (ImageField, nullable), deleted_at (DateTimeField, nullable for soft delete), created_at (DateTimeField), updated_at (DateTimeField). Supply SHALL inherit from SoftDeleteModel.

#### Scenario: Supply subclass inherits all base fields
- **WHEN** a developer creates a concrete model inheriting from `Supply`
- **THEN** the model SHALL automatically have all shared fields

### Requirement: Ingredient inherits from Supply
The existing `Ingredient` model SHALL inherit from the `Supply` abstract base class. All existing Ingredient fields (nutritional values, scores, price_per_kg) SHALL be preserved. The separate `Price` model SHALL be removed — `price_per_kg` on Ingredient is the sole price field.

#### Scenario: Ingredient with standalone food flag
- **WHEN** an Ingredient has is_standalone_food=True
- **THEN** the ingredient SHALL appear in recipe search results with a "Einzelzutat" badge

#### Scenario: Ingredient detail page
- **WHEN** a user navigates to `/ingredients/:slug`
- **THEN** the page SHALL display: name, description, nutritional values, portions, price_per_kg
- **THEN** a "Wo wird das verwendet" section SHALL list all recipes and meal events using this ingredient

## REMOVED Requirements

### Requirement: Purchase Links
**Reason**: Simplified data model. Purchase links add complexity without current user need. Can be re-added later if needed.
**Migration**: Existing purchase_links JSONField data on Material will be preserved. No purchase links existed on Ingredient.

### Requirement: Price model on Portion
**Reason**: Price model is removed entirely. Only `price_per_kg` on Ingredient remains.
**Migration**: Existing Price data already cascaded to `Ingredient.price_per_kg`. Price table dropped.
