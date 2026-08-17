## ADDED Requirements

### Requirement: Meal aggregation supports extended rule parameters
The system SHALL aggregate values required for planner rule evaluation at meal, day, and meal_event scope. Aggregated values SHALL include nutrition parameters, `price_total`, `weight_g`, and `nutri_class` where data is available.

#### Scenario: Meal aggregation includes price and weight
- **WHEN** a meal contains recipe items with cached prices and weights
- **THEN** the meal aggregation SHALL include `price_total` and `weight_g` scaled by each meal item's factor

#### Scenario: Day aggregation includes all meals
- **WHEN** a day contains multiple meals of different `meal_type` values
- **THEN** the day aggregation SHALL include all meals in the day's `price_total`, `weight_g`, and nutrition totals

#### Scenario: MealPlan aggregation includes all plan meals
- **WHEN** a MealPlan contains meals across multiple days
- **THEN** the plan aggregation SHALL include all meals in total and average values used by `scope="meal_event"` rules

### Requirement: Nutri-Score aggregation
The system SHALL aggregate `nutri_class` as an average numeric value using the existing 1=A to 5=E mapping. The average SHALL ignore missing or zero Nutri-Score values.

#### Scenario: Meal Nutri average
- **WHEN** a meal contains recipes with Nutri classes A and C
- **THEN** the aggregated `nutri_class` SHALL be the numeric average of the available classes

#### Scenario: Missing Nutri values
- **WHEN** a recipe in an aggregation has no Nutri class
- **THEN** the missing value SHALL NOT force the aggregate Nutri class to zero

### Requirement: Recipe cached weight
The system SHALL maintain a cached recipe weight value for efficient meal, day, and plan aggregation. The cached weight SHALL be recalculated when RecipeItems or ingredient portions change.

#### Scenario: Recipe cache recalculation stores weight
- **WHEN** a recipe cache is recalculated
- **THEN** the system SHALL store the recipe's total weight in grams as a cached value

#### Scenario: Meal aggregation uses cached weight
- **WHEN** a meal contains a recipe with cached weight and a scaling factor
- **THEN** the meal aggregation SHALL add `cached_weight_g × factor` to `weight_g`

#### Scenario: Existing recipe without cached weight
- **WHEN** a meal contains an existing recipe whose cached weight is missing
- **THEN** the system SHALL still produce a correct aggregation by recalculating or falling back to RecipeItem-derived weight
