## ADDED Requirements

### Requirement: Integrated shopping list at document end

The print view SHALL include a comprehensive shopping list section at the end of the meal plan document.

#### Scenario: Shopping list section
- **WHEN** user views meal plan print page
- **THEN** a "Einkaufsliste" or "Shopping List" section appears after all day sections
- **AND** section is clearly marked with heading and separator

### Requirement: Per-day ingredient aggregation

Shopping list SHALL include ingredient breakdowns by day, showing what to purchase for each day.

#### Scenario: Daily ingredient list
- **WHEN** viewing shopping list
- **THEN** each day's ingredients are grouped together
- **AND** format is: "Tag 1: Zutat 1 (Menge), Zutat 2 (Menge), ..."
- **AND** ingredients are aggregated from all meals in that day

#### Scenario: Same ingredient across days
- **WHEN** ingredient appears in multiple days (e.g., "Salz")
- **THEN** ingredient is listed separately for each day with its own quantity
- **AND** totals are shown in the totals section (not aggregated in per-day section)

### Requirement: Total ingredient summary

Shopping list SHALL include a totals section summing all ingredients across the entire meal plan.

#### Scenario: Ingredient totals
- **WHEN** viewing shopping list totals section
- **THEN** all ingredients are summed by name
- **AND** format is: "Zutat (Gesamtmenge)"
- **EXAMPLE**: "Salz (200g)", "Tomaten (5kg)", "Eier (120 Stück)"

#### Scenario: Quantity units preservation
- **WHEN** aggregating ingredient quantities
- **THEN** units are preserved as provided by recipe (e.g., "kg", "g", "L", "Stück")
- **AND** quantities with same unit are summed
- **AND** different units are NOT converted (e.g., "500ml" and "200ml" both shown, user sums to "700ml")

### Requirement: Missing or incomplete ingredient data handling

Shopping list SHALL gracefully handle meals or recipes with missing ingredient information.

#### Scenario: Recipe without ingredients
- **WHEN** a meal/recipe has no ingredient data available
- **THEN** placeholder "[Zutaten nicht verfügbar]" appears for that meal
- **AND** shopping list totals are not affected (missing data is skipped, not zeroed)

### Requirement: Shopping list formatting for readability

Shopping list SHALL be formatted for easy scanning and purchasing workflow.

#### Scenario: List formatting
- **WHEN** viewing shopping list
- **THEN** ingredients are:
  - Sorted alphabetically or by category (if available)
  - Formatted with consistent spacing
  - Clearly separated into per-day and totals sections

#### Scenario: Section headers
- **WHEN** rendering shopping list
- **THEN** headers are:
  - "Einkaufsliste" or "Shopping List" (main header)
  - "Pro Tag" or "Per Day" (per-day section header)
  - "Gesamt" or "Totals" (totals section header)
