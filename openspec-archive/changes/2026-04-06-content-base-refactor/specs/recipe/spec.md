## MODIFIED Requirements

### Requirement: Recipe Model inherits from Content
Recipe SHALL inherit from the abstract `Content` base class instead of defining its own base fields. All existing Recipe-specific fields (recipe_type, servings) SHALL be preserved. Duplicated fields (title, slug, summary, description, difficulty, costs_rating, execution_time, status, image, created_at, updated_at) SHALL come from Content.

#### Scenario: Recipe has all Content fields
- **WHEN** a Recipe is created
- **THEN** it SHALL have all Content base fields (title, slug, summary, description, tags, scout_levels, authors, embedding, etc.)
- **THEN** it SHALL also have recipe-specific fields (recipe_type, servings)

### Requirement: Recipe Material Section
Recipe SHALL support Material assignment via ContentMaterialItem for kitchen equipment (knives, cutting boards, ovens, etc.). Materials SHALL be displayed in a separate "Küchengeräte" section, distinct from the "Zutaten" section.

#### Scenario: Recipe with kitchen equipment
- **WHEN** a Recipe has Materials assigned
- **THEN** a "Küchengeräte" section SHALL appear below or alongside the "Zutaten" section
- **THEN** each material SHALL link to the Material detail page

### Requirement: RecipeItem uses Supply-based Ingredient
RecipeItem SHALL reference `supply.Ingredient` and `supply.Portion` instead of `idea.Ingredient` and `idea.Portion`. The cross-app FK pattern SHALL remain the same.

#### Scenario: RecipeItem references supply.Ingredient
- **WHEN** a RecipeItem is created
- **THEN** it SHALL reference a Portion from the supply app
- **THEN** quantities SHALL be per NormPerson

## REMOVED Requirements

### Requirement: RecipeComment Model
**Reason**: Replaced by generic ContentComment from content app
**Migration**: All RecipeComment data SHALL be migrated to ContentComment with content_type pointing to Recipe

### Requirement: RecipeEmotion Model
**Reason**: Replaced by generic ContentEmotion from content app
**Migration**: All RecipeEmotion data SHALL be migrated to ContentEmotion with content_type pointing to Recipe

### Requirement: RecipeView Model
**Reason**: Replaced by generic ContentView from content app
**Migration**: All RecipeView data SHALL be migrated to ContentView with content_type pointing to Recipe

### Requirement: Recipe standalone status field
**Reason**: Status management is now handled by Content base class with approval workflow
**Migration**: Existing Recipe status values SHALL be mapped to new ContentStatus choices
