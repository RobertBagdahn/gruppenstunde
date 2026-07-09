## ADDED Requirements

### Requirement: Greyscale + green accent color scheme

The print view SHALL use greyscale for general text and borders, with green accents only for day headers and key section markers.

#### Scenario: Text colors
- **WHEN** rendering meal ingredients or body text
- **THEN** text is black or dark grey (#000 or #333)

#### Scenario: Day header colors
- **WHEN** rendering day header section
- **THEN** header uses green background or border (using theme primary color: hsl(142 76% 36%))

#### Scenario: Border colors
- **WHEN** rendering meal boxes or section separators
- **THEN** borders are grey (#d4d4d8 or similar); only day sections use green

### Requirement: Meal box styling

Meal boxes SHALL have clear visual definition with borders and padding.

#### Scenario: Meal container styling
- **WHEN** rendering a meal
- **THEN** meal displays in a box with:
  - 2px grey border (left or all sides)
  - 1rem padding inside box
  - White background
  - Consistent spacing between meals (0.5rem–1rem gap)

#### Scenario: Multiple boxes stacking
- **WHEN** multiple meals are rendered within a day
- **THEN** boxes stack vertically with consistent spacing and alignment

### Requirement: Professional spacing and typography hierarchy

Print view SHALL follow professional design standards for spacing and visual hierarchy.

#### Scenario: Section spacing
- **WHEN** rendering sections (day headers, meals, shopping list)
- **THEN** spacing is:
  - Between days: 2rem (to visual separation + page break)
  - Between meals in a day: 1rem
  - Between meal header and ingredients: 0.5rem

#### Scenario: Padding consistency
- **WHEN** rendering meal box or section
- **THEN** internal padding is consistent (typically 1rem on all sides)

### Requirement: No background colors for body content

Body content (ingredients, descriptions) SHALL have white backgrounds. Only headers and notes areas MAY have subtle background colors if needed.

#### Scenario: Content background
- **WHEN** rendering meal ingredients list
- **THEN** background is white (no tinted or colored background)

### Requirement: Minimalist visual design

The print view SHALL avoid unnecessary visual clutter. Only essential elements (borders, text, symbols) SHALL be visible.

#### Scenario: Clean appearance
- **WHEN** user views or prints meal plan
- **THEN** no unnecessary shadows, gradients, or decorative elements appear
- **AND** focus is on readability and information clarity
