## ADDED Requirements

### Requirement: Day-per-page layout with page breaks

The print view SHALL render each day on a new page using CSS page-break rules. Meals within a day SHALL be kept together and never split across pages.

#### Scenario: Single day meal plan
- **WHEN** user opens meal plan print view with one day
- **THEN** all meals for that day display on a single page

#### Scenario: Multi-day meal plan
- **WHEN** user opens meal plan print view with 3+ days
- **THEN** each day starts on a new page; Day 1 on page 1, Day 2 on page 2, etc.

#### Scenario: Meal overflow within day
- **WHEN** a day has many meals that exceed one page (e.g., 8 meals)
- **THEN** the day's content flows to next page while maintaining visual day grouping

### Requirement: Meal container structure

Each meal SHALL be rendered in a visually distinct container (box) with borders and padding. The container SHALL include meal type, time, and ingredients list.

#### Scenario: Meal box layout
- **WHEN** rendering a meal (e.g., "Frühstück 08:00")
- **THEN** the meal displays in a bordered box with:
  - Meal type (e.g., "FRÜHSTÜCK") as bold header
  - Time inline with meal type (e.g., "(08:00 Uhr)")
  - Ingredients as bulleted list below
  - Clear left border or box border (2px grey)

#### Scenario: Multiple meals per day
- **WHEN** a day has 4 meals (breakfast, snack, lunch, dinner)
- **THEN** each meal appears in its own box with consistent spacing between boxes

### Requirement: Day header with visual distinction

Each day SHALL have a prominent header showing the formatted date. The header SHALL include visual styling to signal a new day section.

#### Scenario: Day header display
- **WHEN** starting a new day section
- **THEN** the day header displays:
  - Formatted date (e.g., "Montag, 14. Juli 2025")
  - 18pt bold font
  - Green background or border accent (using theme primary color)
  - Clear separation from previous day

### Requirement: A4 page margins

The print layout SHALL respect standard A4 margins for printability.

#### Scenario: Page margins
- **WHEN** user prints the page
- **THEN** margins are set to 2cm on all sides (as per @page CSS rule)

### Requirement: Maximum content width (A4-optimized)

The content SHALL be constrained to a width that fits A4 pages when printed.

#### Scenario: Content width
- **WHEN** rendering meal plan content
- **THEN** max-width is set to 21cm (standard A4 width minus margins)
