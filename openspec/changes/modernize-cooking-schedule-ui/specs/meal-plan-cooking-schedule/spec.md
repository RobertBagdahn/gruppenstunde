# Meal Plan Cooking Schedule (Delta)

## MODIFIED Requirements

### Requirement: Cooking schedule timeline visualization
The system SHALL display cooking schedule items in a clear timeline format with modernized visual design.

**Previous behavior**: Timeline items displayed redundant color dots and vertical lines alongside meal category indicators.

**Updated behavior**: Timeline items display clean recipe information without duplicate category indicators. Category information is unified in the section header above.

#### Scenario: Timeline item rendering
- **WHEN** user views cooking schedule for a day with multiple recipes
- **THEN** each recipe displays:
  - Start time (bold, primary color)
  - Serving time (muted)
  - Recipe title (linked, hover-interactive)
  - Lead time and category badge
  - Allergen indicators (if present)
- **AND** no colored dot appears on the item itself
- **AND** no vertical timeline line connects items

#### Scenario: Category section header
- **WHEN** user views a meal category section (Frühstück, Mittagessen, etc.)
- **THEN** the header displays:
  - Single colored dot matching the meal category
  - Category name (localized: Frühstück, Mittagessen, Abendessen, Snack)
  - Optional: Modern icon representing the meal type
- **AND** this is the ONLY indicator for the category—no duplication in items below

### Requirement: Icon modernization
The system SHALL use Lucide React icons for all cooking schedule icons.

**Previous behavior**: Mixed Material Design strings and random emoji in inline elements.

**Updated behavior**: All icons sourced from lucide-react library, consistent across the module.

#### Scenario: Icon imports and usage
- **WHEN** CookingScheduleTab component loads
- **THEN** all icons come from lucide-react imports:
  - `Clock` → for timer/duration
  - `UtensilsCrossed` → for ingredients
  - `ListChecks` → for cooking steps
  - `AlertTriangle` → for allergens
  - `ChefHat`, `Calendar`, etc. → for navigation/category context
- **AND** no Material Design icon strings remain in the component

### Requirement: Refined styling and interactions
The system SHALL apply modern, subtle design enhancements without aggressive animations.

**Previous behavior**: Static timeline with minimal visual feedback.

**Updated behavior**: Refined hover states and subtle transitions for better UX.

#### Scenario: Hover effects on interactive elements
- **WHEN** user hovers over a meal category header
- **THEN** background applies subtle color tint (5-10% opacity)
- **AND** icon scales to 105% over 150ms transition

#### Scenario: Expanded item detail view
- **WHEN** user clicks on a recipe item to expand details
- **THEN** expanded content slides smoothly without jarring layout shift
- **AND** chevron icon rotates (ChevronRight → ChevronDown) with animation
