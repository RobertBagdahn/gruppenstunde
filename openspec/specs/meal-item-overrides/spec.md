## ADDED Requirements

### Requirement: MealItemOverride Model
The system SHALL provide a MealItemOverride model with: meal_item FK, recipe_item FK, quantity_override (nullable Decimal), and excluded (bool, default false).

#### Scenario: Override excludes an ingredient
- **WHEN** a MealItemOverride exists with excluded=true for a recipe_item
- **THEN** that ingredient SHALL be excluded from: shopping list generation, nutrition calculation (`nutrition_summary`), cost calculation (`cost_summary`), variant energy/cost computation, and cockpit aggregation (`nutrition_aggregation`)

#### Scenario: Override adjusts quantity
- **WHEN** a MealItemOverride exists with a quantity_override value
- **THEN** the overridden quantity (in the same unit as `ri.quantity`, i.e. portion count) SHALL be used instead of the original recipe_item quantity in: shopping list generation, nutrition calculation, cost calculation, variant energy/cost computation, and cockpit aggregation

### Requirement: Meal Item Overrides API
The system SHALL provide PATCH /api/meal-plans/{id}/meal-items/{item_id}/overrides/ accepting a list of override objects.

#### Scenario: Setting overrides
- **WHEN** a client PATCHes a list of overrides for a meal item
- **THEN** the system SHALL create or update MealItemOverride records for each specified recipe_item

#### Scenario: Overrides included in meal plan detail
- **WHEN** a client GETs the meal plan detail
- **THEN** each meal item SHALL include its list of overrides with recipe_item reference, quantity_override, and excluded flag

### Requirement: Shopping List Respects Overrides
Shopping list generation MUST apply MealItemOverride data when calculating quantities.

#### Scenario: Excluded items omitted from shopping list
- **WHEN** a shopping list is generated from a meal plan with excluded overrides
- **THEN** the excluded recipe items SHALL NOT appear in the shopping list

#### Scenario: Quantity overrides reflected in shopping list
- **WHEN** a shopping list is generated from a meal plan with quantity overrides
- **THEN** the overridden quantities SHALL be used instead of original recipe quantities

### Requirement: Nutrition Summary Respects Overrides

Der `GET /api/meal-plans/{id}/nutrition-summary/`-Endpunkt MUST `MealItemOverride` bei der Nährwertberechnung anwenden.

#### Scenario: Excluded override entfernt Beitrag aus Nährwert-Summary
- **GIVEN** ein `MealItem` mit Rezept, das Zutat A (energy_kcal=500 gesamt) und Zutat B enthält
- **AND** ein `MealItemOverride` mit `excluded=True` für Zutat B
- **WHEN** `GET /api/meal-plans/{id}/nutrition-summary/` aufgerufen wird
- **THEN** trägt Zutat B **nichts** zur `energy_kcal`-Summe bei

#### Scenario: quantity_override reduziert Nährwert-Beitrag proportional
- **GIVEN** ein RecipeItem mit `quantity=4` (4 Portionen à 60g = 240g)
- **AND** ein `MealItemOverride` mit `quantity_override=2`
- **WHEN** Nährwerte berechnet werden
- **THEN** wird `weight_g = 2 × 60 = 120g` verwendet (halb so viel wie ohne Override)

### Requirement: Cost Summary Respects Overrides

Der `GET /api/meal-plans/{id}/costs/`-Endpunkt MUST `MealItemOverride` bei der Kostenberechnung anwenden.

#### Scenario: Excluded override senkt Gesamtkosten
- **GIVEN** ein Rezept mit zwei Zutaten, Zutat B koste 3 €
- **AND** ein `MealItemOverride` mit `excluded=True` für Zutat B
- **WHEN** `GET /api/meal-plans/{id}/costs/` aufgerufen wird
- **THEN** sind die Gesamtkosten um den Beitrag von Zutat B reduziert

### Requirement: Cockpit Aggregation Respects Overrides

Der Cockpit-Aggregations-Service (`nutrition_aggregation._aggregate_meal_values`) MUST bei gecachten Rezepten die Nährwerte Item-für-Item recomputen und dabei `MealItemOverride` anwenden, statt den gecachten Gesamtwert zu verwenden.

#### Scenario: Cockpit zeigt reduzierte Energie bei Override
- **GIVEN** ein Rezept mit `cached_energy_total_kcal=1000` und einer Zutat, die 300 kcal beiträgt
- **AND** ein `MealItemOverride` mit `excluded=True` für diese Zutat
- **WHEN** das Cockpit die Mahlzeit auswertet
- **THEN** zeigt das Cockpit ca. 700 kcal (nicht 1000)
