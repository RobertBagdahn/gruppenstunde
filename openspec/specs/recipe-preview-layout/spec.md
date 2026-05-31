## Requirements

### Requirement: Recipe preview shows sectioned layout
The recipe preview in the creation wizard (step 3) SHALL display content in distinct visual sections with headings, matching the information architecture of the recipe detail page.

#### Scenario: Preview renders sections
- **WHEN** user reaches step 3 of recipe creation
- **THEN** the preview displays separate sections for: recipe meta (type + servings), KPIs, ingredients, description, and tags

### Requirement: Ingredients displayed as vertical list
The recipe preview SHALL render ingredients as a vertical list with one ingredient per line showing quantity, unit, and name.

#### Scenario: Multiple ingredients shown as list
- **WHEN** the recipe has 5 ingredients
- **THEN** all 5 ingredients are displayed as individual list items (not inline chips)

### Requirement: KPIs displayed in grid layout
The recipe preview SHALL render KPI values (difficulty, execution time, costs rating, preparation time) in a 2×2 grid with icons and labels.

#### Scenario: All KPIs present
- **WHEN** the recipe has all four KPI values set
- **THEN** they are displayed in a 2-column, 2-row grid layout with corresponding icons

#### Scenario: Partial KPIs
- **WHEN** only difficulty and execution time are set
- **THEN** only those KPIs appear in the grid (grid adapts gracefully)

### Requirement: No computed data in preview
The recipe preview SHALL NOT display nutrition values, Nutri-Score, price analysis, or any data that requires server-side computation.

#### Scenario: Preview without nutrition
- **WHEN** user views the recipe preview before saving
- **THEN** no nutrition information, Nutri-Score badge, or price breakdown is shown
