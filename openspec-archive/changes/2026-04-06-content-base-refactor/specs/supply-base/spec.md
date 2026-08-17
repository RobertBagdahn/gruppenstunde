## ADDED Requirements

### Requirement: Abstract Supply Base Class
The system SHALL provide an abstract Django model `Supply` as the base class for Material and Ingredient. The abstract model SHALL include: name (CharField, max 255), slug (SlugField, unique per table), description (TextField, Markdown), image (ImageField, nullable), deleted_at (DateTimeField, nullable for soft delete), created_at (DateTimeField), updated_at (DateTimeField). Supply SHALL inherit from SoftDeleteModel.

#### Scenario: Supply subclass inherits all base fields
- **WHEN** a developer creates a concrete model inheriting from `Supply`
- **THEN** the model SHALL automatically have all shared fields

### Requirement: Material Model
The system SHALL provide a `Material` model inheriting from `Supply` for tools and equipment (knives, cutting boards, ovens, paper, pens, etc.). Additional fields: material_category (TextChoices: tools/crafting/kitchen/outdoor/stationery/other), is_consumable (BooleanField, default False), purchase_links (JSONField, list of {url, shop_name, price}).

#### Scenario: Creating a material
- **WHEN** a user creates a new Material entry
- **THEN** the material SHALL be stored with all Supply base fields plus material-specific fields
- **THEN** the slug SHALL be auto-generated from the name

#### Scenario: Viewing material detail page
- **WHEN** a user navigates to `/materials/:slug`
- **THEN** the page SHALL display: name, description, image, category, purchase links
- **THEN** a "Wo wird das verwendet" section SHALL list all content items using this material

### Requirement: Ingredient inherits from Supply
The existing `Ingredient` model SHALL be refactored to inherit from the `Supply` abstract base class. All existing Ingredient fields (nutritional values, scores, portions, prices) SHALL be preserved. The `is_standalone_food` BooleanField SHALL be added.

#### Scenario: Ingredient with standalone food flag
- **WHEN** an Ingredient has is_standalone_food=True
- **THEN** the ingredient SHALL appear in recipe search results with a "Einzelzutat" badge
- **THEN** clicking SHALL navigate to the ingredient detail page at `/ingredients/:slug`

#### Scenario: Ingredient detail page
- **WHEN** a user navigates to `/ingredients/:slug`
- **THEN** the page SHALL display: name, description, nutritional values, portions, prices, purchase links
- **THEN** a "Wo wird das verwendet" section SHALL list all recipes and meal plans using this ingredient

### Requirement: ContentMaterialItem Model
The system SHALL provide a `ContentMaterialItem` model for assigning Materials to content items (GroupSession, Recipe). Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), material (FK to Material), quantity (DecimalField), quantity_per_person (BooleanField, default True), unit (CharField, optional), sort_order (PositiveIntegerField).

#### Scenario: Adding material to a GroupSession
- **WHEN** an author adds a Material to a GroupSession
- **THEN** a ContentMaterialItem SHALL be created linking the GroupSession to the Material
- **THEN** the quantity SHALL be interpreted as per-person if quantity_per_person=True

#### Scenario: Adding kitchen equipment to a Recipe
- **WHEN** an author adds a Material (e.g., "Schneidebrett") to a Recipe
- **THEN** the material SHALL appear in a separate "Küchengeräte" section (not mixed with ingredients)

### Requirement: Supply Search in Content Creation
During content creation (stepper), the system SHALL provide a search field for finding existing Supply entries (Materials or Ingredients). If no matching entry is found, the user SHALL be prompted to create a new one.

#### Scenario: Searching for existing supply
- **WHEN** a user types "Messer" in the supply search field
- **THEN** the system SHALL search Materials by name using fuzzy matching (pg_trgm, threshold 0.3)
- **THEN** matching results SHALL be displayed as a dropdown

#### Scenario: No supply found — suggest creation
- **WHEN** a user searches for a Supply that doesn't exist
- **THEN** the system SHALL show a "Neuen Eintrag anlegen" button
- **THEN** clicking SHALL open a dialog to create a new Material or Ingredient

### Requirement: Supply used in Packing Lists
PackingItem in the packinglist app SHALL optionally reference a Supply (Material or Ingredient) via a ContentType-based FK. This enables packing lists to link to the central supply database.

#### Scenario: Packing list item linked to supply
- **WHEN** a packing list item references a Material
- **THEN** the item SHALL display a link to the Material detail page
- **THEN** the price and description from the Material SHALL be available

#### Scenario: Packing list item without supply link
- **WHEN** a packing list item has no supply reference
- **THEN** it SHALL behave as a plain text item (current behavior)

### Requirement: Supply Admin Management
The Django admin and frontend admin SHALL provide comprehensive management for Materials and Ingredients. Both SHALL be manageable with search, filtering, and inline editing.

#### Scenario: Admin material list
- **WHEN** an admin navigates to the material admin page
- **THEN** materials SHALL be listed with: name, category, is_consumable, usage_count, created_at
- **THEN** the admin SHALL be able to filter by category and search by name

#### Scenario: Admin ingredient list
- **WHEN** an admin navigates to the ingredient admin page
- **THEN** ingredients SHALL be listed with: name, nutri_score, portion_count, price info, usage_count
- **THEN** the admin SHALL be able to filter by nutritional tags and retail section

### Requirement: Purchase Links
Both Material and Ingredient SHALL support multiple purchase links. Each link SHALL contain: url (URLField), shop_name (CharField), price (DecimalField, nullable), currency (CharField, default 'EUR'), last_checked (DateTimeField, nullable).

#### Scenario: Viewing purchase links on detail page
- **WHEN** a user views a Supply detail page
- **THEN** purchase links SHALL be displayed as a list with shop name, price, and clickable URL
- **THEN** links SHALL open in a new tab
