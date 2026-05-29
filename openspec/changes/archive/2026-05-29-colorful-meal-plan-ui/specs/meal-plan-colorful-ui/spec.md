## ADDED Requirements

### Requirement: MealItem SHALL include energy and cost data
The API response for `MealItemOut` SHALL include `energy_kj` (float | null) and `cost_eur` (float | null) fields. These values MUST be calculated from the linked Recipe's cached values, scaled by the item's `factor` and the plan's portion ratio (`norm_portions / recipe.servings`).

#### Scenario: MealItem with linked recipe that has cached nutrition
- **WHEN** a MealItem references a Recipe with `cached_energy_kj = 4200` and `cached_price_total = 8.50`, the Recipe has `servings = 4`, the MealPlan has `norm_portions = 10`, and the MealItem has `factor = 1.0`
- **THEN** the API returns `energy_kj = 4200 * (10/4) * 1.0 = 10500` and `cost_eur = 8.50 * (10/4) * 1.0 = 21.25`

#### Scenario: MealItem with recipe without cached data
- **WHEN** a MealItem references a Recipe where `cached_energy_kj` is null
- **THEN** the API returns `energy_kj = null` and `cost_eur = null`

#### Scenario: MealItem with only ingredient (no recipe)
- **WHEN** a MealItem has `recipe_id = null` and `ingredient_id` set
- **THEN** the API returns `energy_kj = null` and `cost_eur = null`

### Requirement: Meal SHALL include total energy and cost sums
The API response for `MealOut` SHALL include `total_energy_kj` (float) and `total_cost_eur` (float) as the sum of all items' energy/cost values (null items count as 0).

#### Scenario: Meal with multiple items
- **WHEN** a Meal has items with energy_kj values [4200, null, 3000]
- **THEN** `total_energy_kj = 7200` and items with null are excluded from sum

### Requirement: Meals without recipes SHALL be visually highlighted as missing
The UI MUST display meals with zero items using a red accent (border, background, or icon) to signal that a recipe assignment is needed.

#### Scenario: Empty meal displayed
- **WHEN** a Meal has `items.length === 0`
- **THEN** the meal slot shows a red-tinted background (`bg-red-50` or equivalent), a red warning icon, and the text "Noch kein Rezept zugeordnet" in red

#### Scenario: Meal with at least one item
- **WHEN** a Meal has one or more items
- **THEN** no red accent is shown on the meal container

### Requirement: Each meal SHALL display calorie coverage percentage
The UI MUST show a percentage indicating how much of the expected calorie need the meal covers. The expected need is `daily_target_kj * day_part_factor`. The daily target is `8368 kJ * activity_factor` (≈ 2000 kcal base).

#### Scenario: Meal covers expected calories exactly
- **WHEN** meal.total_energy_kj equals daily_target_kj * day_part_factor (coverage = 100%)
- **THEN** the percentage shows "100%" in green

#### Scenario: Meal is significantly under target
- **WHEN** coverage is below 80%
- **THEN** the percentage shows in yellow (50-80%) or red (<50%)

#### Scenario: Meal exceeds target significantly
- **WHEN** coverage is above 120%
- **THEN** the percentage shows in yellow (120-150%) or red (>150%)

### Requirement: Add buttons SHALL be green
All "add" action buttons (add recipe, add meal type, add day) MUST use green color styling (`text-green-600`, `bg-green-50` on hover, or equivalent).

#### Scenario: Add recipe button rendering
- **WHEN** the add-recipe button is rendered
- **THEN** it uses green color scheme (not muted/gray)

### Requirement: Each meal type SHALL have a distinct accent color
The UI MUST assign a unique color accent per meal type: Frühstück (orange), Mittagessen (cyan/teal), Abendessen (indigo), Snack (amber), Dessert (pink).

#### Scenario: Breakfast meal rendered
- **WHEN** a meal with `meal_type = "breakfast"` is displayed
- **THEN** the meal header uses an orange accent (icon color, left border, or background tint)

### Requirement: Font sizes SHALL be increased for readability
All text in the meal plan detail view MUST use at minimum `text-base` (16px) for primary content (recipe names, meal type labels, day headers). Secondary info (percentages, prices) MUST use at minimum `text-sm` (14px).

#### Scenario: Recipe name display
- **WHEN** a recipe name is rendered in a meal slot
- **THEN** it uses `text-base` or larger (not `text-sm` or `text-xs`)

### Requirement: Color logic SHALL apply consistently across all tabs
The same semantic color system (green=good, yellow=warning, red=missing/critical) MUST be applied to the Tabelle, Kosten, Einkaufsliste, and Cockpit tabs where applicable.

#### Scenario: Table view cell with missing recipe
- **WHEN** a cell in the table view represents a meal without a recipe
- **THEN** it shows a red accent indicator

#### Scenario: Cost view with incomplete pricing
- **WHEN** cost data has unpriced ingredients
- **THEN** incomplete coverage is highlighted in yellow/red
