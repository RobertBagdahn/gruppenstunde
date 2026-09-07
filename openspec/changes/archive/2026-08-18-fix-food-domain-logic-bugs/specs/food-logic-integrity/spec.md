## ADDED Requirements

### Requirement: Nutri-Score Energy Table Conversion
The system SHALL convert ingredient energy from kilocalories to kilojoules ($kJ = \text{energy\_kcal} \times 4.184$) before comparing against the Nutri-Score energy threshold tables for solid foods (`SOLID_ENERGY_THRESHOLDS`) and beverages (`BEVERAGE_ENERGY_THRESHOLDS`).

#### Scenario: Solid food energy points calculation
- **WHEN** an ingredient with 500 kcal per 100g is evaluated for Nutri-Score
- **THEN** the system converts 500 kcal to 2092 kJ and matches it against `SOLID_ENERGY_THRESHOLDS` (2092 > 2010 kJ $\rightarrow$ 6 negative points instead of 1 point)

#### Scenario: Beverage energy points calculation
- **WHEN** a beverage with 30 kcal per 100ml is evaluated for Nutri-Score
- **THEN** the system converts 30 kcal to 125.5 kJ and matches it against `BEVERAGE_ENERGY_THRESHOLDS` (125.5 > 120 kJ $\rightarrow$ 4 negative points instead of 1 point)

### Requirement: Nutri-Score Sodium Derivation from Salt
The system SHALL automatically derive sodium from salt ($1\text{g salt} \approx 400\text{mg sodium}$) during Nutri-Score calculation if `ingredient.sodium_mg` is `None` but `ingredient.salt_g` is provided.

#### Scenario: Automatic sodium derivation
- **WHEN** an ingredient has `salt_g = 1.5` and `sodium_mg = None`
- **THEN** the system calculates $1.5 \times 400 = 600\text{mg sodium}$ and scores 7 negative sodium points instead of 0 points

### Requirement: Cooking Schedule Includes Direct Meal Ingredients
The system SHALL include direct ingredients (`MealItem.ingredient` without a recipe) in the cooking schedule generation (`build_cooking_schedule`) and the Cooking Schedule PDF export (`cooking_schedule_pdf.py`). Direct ingredients SHALL contribute to schedule timeline lists, total cooking nutrition, and total cooking costs.

#### Scenario: Direct breakfast items appear in cooking schedule
- **WHEN** a meal contains direct ingredients like bread and butter alongside or instead of recipes
- **THEN** the cooking schedule lists those ingredients under the meal slot with correctly scaled quantities ($quantity \times effective\_portions$)
- **AND** their energy and cost contribute to the day's total energy and cost in the schedule

### Requirement: Shopping List PDF Domain Generation
The PDF export for meal plans SHALL generate the shopping list using the domain `generate_shopping_list(meal_plan)` service, preserving supermarket retail sections and correctly aggregating ingredient amounts across different units.

#### Scenario: PDF shopping list preserves retail sections
- **WHEN** a user exports a meal plan to PDF
- **THEN** the shopping list section groups items by their supermarket retail sections rather than grouping everything into "Sonstiges"

#### Scenario: Mixed unit aggregation in PDF
- **WHEN** multiple recipes contribute the same ingredient in grams or portion units
- **THEN** the PDF shopping list displays the mathematically correct aggregated total amount without regex string corruption

### Requirement: REWE Export Safe Fallback
The REWE export quantity computation SHALL NOT use sub-portion units (with rank 1 or weight $< 20\text{g}$, such as teaspoons or pinches) as package multipliers when no `Package` exists.

#### Scenario: Safe fallback to gram or kg units
- **WHEN** an ingredient has a 1000g shopping requirement, no `Package` defined, and a rank=1 cooking portion of 5g (1 TL)
- **THEN** REWE export falls back to 1000g (or 1 kg) rather than ordering 200 packages of 5g
