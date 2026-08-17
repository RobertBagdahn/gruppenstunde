## ADDED Requirements

### Requirement: Nutrition pie chart on RecipeDetailPage

The RecipeDetailPage SHALL display a pie chart showing macronutrient distribution (protein, fat, carbohydrates) using Recharts.

#### Scenario: Pie chart renders with nutrition data
- **WHEN** a recipe has nutritional data (protein, fat, carbohydrates per serving)
- **THEN** a `<PieChart>` SHALL be displayed in the nutrition section
- **THEN** the chart SHALL show three segments: Eiweiss (protein), Fett (fat), Kohlenhydrate (carbohydrates)
- **THEN** each segment SHALL be labeled with the nutrient name and gram value
- **THEN** the chart SHALL use distinct colors per nutrient (e.g., blue for protein, yellow for fat, green for carbs)

#### Scenario: Pie chart hidden when no data
- **WHEN** a recipe has no nutritional data
- **THEN** the pie chart SHALL NOT be rendered
- **THEN** the existing text-based nutrition display SHALL remain as fallback

### Requirement: Content statistics bar chart on AdminPage

The AdminPage SHALL display a bar chart showing content count per content type.

#### Scenario: Bar chart renders content statistics
- **WHEN** the admin page loads with content statistics
- **THEN** a `<BarChart>` SHALL display bars for each content type (GroupSession, Game, Blog, Recipe)
- **THEN** each bar SHALL be colored according to the content type's theme color
- **THEN** the y-axis SHALL show count values
- **THEN** the x-axis SHALL show content type labels in German

#### Scenario: Admin page replaces number-only cards
- **WHEN** the admin page displays content statistics
- **THEN** the existing number-only stat cards SHALL remain above the chart
- **THEN** the bar chart SHALL be displayed below the stat cards as an additional visualization

### Requirement: Nutrient balance chart on MealEventDetailPage

The MealEventDetailPage NutritionView SHALL display a stacked bar chart showing nutrient distribution per meal day.

#### Scenario: Stacked bar chart renders per day
- **WHEN** a meal event has multiple days with assigned recipes
- **THEN** a `<BarChart>` with stacked bars SHALL show protein, fat, and carbohydrate totals per day
- **THEN** each nutrient SHALL be a distinct color consistent with the RecipeDetailPage pie chart colors
- **THEN** hovering over a bar segment SHALL show a tooltip with the exact gram value

#### Scenario: Chart hidden for events without nutrition data
- **WHEN** a meal event has no recipes assigned or no nutrition data available
- **THEN** the chart SHALL NOT be rendered

### Requirement: Recharts lazy loading

All Recharts components SHALL be lazy-loaded to minimize initial bundle impact.

#### Scenario: Chart components are code-split
- **WHEN** a page with charts is loaded
- **THEN** Recharts components SHALL be loaded via `React.lazy()` with dynamic import
- **THEN** a skeleton placeholder SHALL be shown while the chart component loads
- **THEN** pages without charts SHALL NOT include any Recharts code in their bundle
