## MODIFIED Requirements

### Requirement: Meal Plan PDF Export
The system SHALL provide GET /api/meal-plans/{id}/export/pdf/ that returns a PDF document generated server-side using WeasyPrint. The PDF SHALL render recipe variants (Exchange-Splits) as separate, fully-listed ingredient blocks per variant.

#### Scenario: Successful PDF generation
- **WHEN** a user requests the PDF export for a valid meal plan
- **THEN** the system SHALL return a PDF with Content-Type application/pdf containing plan name, date range, daily meals table, recipes per meal, portions, and total shopping list

#### Scenario: German locale formatting
- **WHEN** the PDF is generated
- **THEN** dates SHALL use German format (dd.MM.yyyy), numbers SHALL use comma as decimal separator, and weekdays SHALL be in German

#### Scenario: PDF contains daily meals table
- **WHEN** the PDF is rendered
- **THEN** it SHALL include a table with one row per day showing date, meal type, recipe name, and portions

#### Scenario: PDF contains aggregated shopping list
- **WHEN** the PDF is rendered
- **THEN** it SHALL include a shopping list section with all ingredients summed across all meals in the plan

#### Scenario: Meal plan not found
- **WHEN** a user requests PDF export for a non-existent or unauthorized meal plan
- **THEN** the system SHALL return HTTP 404

#### Scenario: Recipe with exchange split rendered as separate blocks
- **WHEN** a meal item has an exchange split (e.g. 8 portions Parmesan, 2 portions Cashew)
- **THEN** the PDF SHALL render two separate recipe blocks, each with a complete ingredient list, scaled to its respective portion count (e.g. "Variante Parmesan — 8 Portionen" and "Variante Cashew — 2 Portionen")

#### Scenario: Optional ingredient excluded from print
- **WHEN** a meal item has an optional ingredient with share 0.0 (excluded)
- **THEN** the PDF block SHALL NOT list that ingredient

#### Scenario: Recipe without splits rendered as single block
- **WHEN** a meal item has no exchange or optional splits
- **THEN** the PDF SHALL render a single recipe block as before, with no variant separation
