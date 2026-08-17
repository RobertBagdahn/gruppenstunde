## ADDED Requirements

### Requirement: Drinks excluded from calorie day balance
Meals of type `drinks` SHALL be excluded from the calorie (kcal) day balance in both the Tagesplan day header and the backend nutrition summary. Their own calories MAY be shown informationally on the drinks slot, but SHALL NOT contribute to the day's Soll or Ist kcal totals.

#### Scenario: Drinks calories excluded from day total
- **WHEN** a day contains a breakfast (400 kcal) and a drinks slot (150 kcal)
- **THEN** the day's Ist kcal total SHALL be 400, not 550

#### Scenario: Drinks slot shows no Soll/Ist percentage
- **WHEN** a drinks slot is rendered (`day_part_factor=0.0`)
- **THEN** it SHALL NOT display a Soll/Ist coverage percentage, but MAY display its own kcal and cost informationally

### Requirement: Drinks included in cost and shopping list
Meals of type `drinks` SHALL be treated like any other meal for cost aggregation (`total_cost_eur`, day and plan cost summaries) and for shopping list generation. Only the calorie balance excludes them.

#### Scenario: Drinks cost included in day cost
- **WHEN** a day contains a drinks slot with items costing 5.00 €
- **THEN** the day's total cost SHALL include those 5.00 €

#### Scenario: Drinks items appear in shopping list
- **WHEN** a drinks slot contains an ingredient item
- **THEN** that ingredient SHALL appear in the generated shopping list

### Requirement: Drinks appear in both views
The `drinks` meal type SHALL appear in both the Tagesplan (`DayPlanView`) and the Tabelle (`TableView`) via the shared meal-type label/icon/color maps and meal-type ordering, with the same item and action functionality as other meal types.

#### Scenario: Drinks slot rendered in table view
- **WHEN** the Tabelle is rendered for a day that has a drinks slot
- **THEN** a `Getränke` row SHALL be present with its localized label and icon

#### Scenario: Drinks slot supports adding items
- **WHEN** a user adds a recipe or ingredient to a drinks slot
- **THEN** the item SHALL be added like in any other meal slot
