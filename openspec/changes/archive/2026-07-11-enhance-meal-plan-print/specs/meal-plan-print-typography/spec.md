## ADDED Requirements

### Requirement: Standard body text typography

Body text (ingredients, descriptions) SHALL use 12pt font size for readability in print.

#### Scenario: Ingredient list display
- **WHEN** rendering ingredient list for a meal
- **THEN** ingredients display in 12pt font with 1.4 line-height

#### Scenario: Recipe description
- **WHEN** displaying meal description or metadata
- **THEN** text uses 12pt font size

### Requirement: Meal type header typography

Meal type labels (Frühstück, Mittag, Abendessen, etc.) SHALL be rendered in 16pt bold for clear visual hierarchy.

#### Scenario: Meal type display
- **WHEN** rendering meal type header
- **THEN** meal type displays in 16pt, bold, uppercase or Title Case

#### Scenario: Meal time inline
- **WHEN** displaying meal time alongside meal type
- **THEN** time appears inline in normal weight (e.g., "FRÜHSTÜCK (08:00 Uhr)")

### Requirement: Day header typography

Day headers (dates) SHALL be rendered in 18pt bold for prominent visual hierarchy.

#### Scenario: Day date display
- **WHEN** rendering day header with date
- **THEN** date displays in 18pt, bold, formatted as "Tag, DD. Monat YYYY" (e.g., "Montag, 14. Juli 2025")

### Requirement: Minimalist symbols in typography

Meal type labels SHALL use minimalist symbols instead of large emojis. Symbols SHALL be small and decorative.

#### Scenario: Symbols in meal labels
- **WHEN** rendering meal type
- **THEN** label includes small symbol (e.g., "🥞 FRÜHSTÜCK" or text-only if not supported)
- **AND** symbols are sized appropriately (not oversized)

### Requirement: Font consistency in print

All text in print view SHALL use sans-serif font consistent with web view.

#### Scenario: Font rendering
- **WHEN** user prints meal plan
- **THEN** all fonts render in sans-serif (inherit from body font-family: sans)

### Requirement: Contrast and readability

All text SHALL meet minimum contrast ratios for readability in print (black or dark grey text on white background).

#### Scenario: Text contrast
- **WHEN** rendering ingredients or meal details
- **THEN** text color is black (#000) or dark grey (#333 or better)
- **AND** background remains white for contrast
