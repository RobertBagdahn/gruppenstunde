# meal-cockpit Specification

## Purpose
Defines legacy cockpit migration state and nutrition aggregation behavior used by meal planning suggestions.
## Requirements
### Requirement: HealthRule data model
**Reason**: Replaced by unified `Rule` model in `meal-plan-suggestions` capability.
**Migration**: All HealthRule data migrated to Rule model via data migration. Fields mapped: threshold_green → max_green, threshold_yellow → max_yellow (for max rules) or min_green/min_yellow (for min rules). rule_type set to "nutrition".

### Requirement: Health rules API
**Reason**: Replaced by `/api/rules/` endpoint in `meal-plan-suggestions` capability.
**Migration**: Frontend consumers switch from `/api/health-rules/` to `/api/rules/`.

### Requirement: MealEvent cockpit API
**Reason**: Replaced by `/api/meal-plans/{id}/suggestions/` endpoint in `meal-plan-suggestions` capability.
**Migration**: Frontend switches from cockpit hooks to suggestions hooks.

### Requirement: Traffic light indicators in UI
**Reason**: Ampel indicators are preserved but moved into the Vorschläge tab. Standalone cockpit tab removed.
**Migration**: TrafficLightIndicator component reused in SuggestionDashboard.

### Requirement: Health tips display
**Reason**: Tips are now part of suggestion cards in the Vorschläge tab.
**Migration**: tip_text field preserved on Rule model, shown in suggestion cards.

### Requirement: Cockpit summary card
**Reason**: Replaced by suggestion summary in the Vorschläge tab badge and header.
**Migration**: Summary status logic preserved in suggestion service.

### Requirement: Cockpit evaluates vitamin and mineral health rules
**Reason**: Vitamin/mineral evaluation preserved in the unified Rule system.
**Migration**: All vitamin/mineral HealthRules migrated to Rules with scope and parameters intact.

### Requirement: HealthRule admin interface
**Reason**: Replaced by unified "Regeln" admin tab in `meal-plan-suggestions` capability.
**Migration**: Django admin registration updated for Rule model.

### Requirement: Portion-based nutrition cockpit aggregation
The cockpit aggregation service SHALL calculate nutritional values in Normportion logic by scaling each recipe's cached per-100g values using the recipe's cached weight and the meal item's planned factor. Since every recipe represents exactly one Normportion, `Recipe.servings` is always treated as `1` and there SHALL be no division by `servings`.

#### Scenario: Aggregating meal values in Normportion logic
- **WHEN** a meal has a meal item for a recipe with cached_protein_g = 10.0g (per 100g), cached_weight_g = 800g, and meal item factor = 1.5
- **THEN** the aggregated meal protein contribution SHALL be calculated as 10.0 × (800 / 100.0) × 1.5 = 120.0g
- **AND** there SHALL be no division by `servings`

### Requirement: Normportion-basierte Mahlzeit-Aggregation

Die Aggregations-Services für Mahlzeit-, Tages- und Plan-Scope MUST Nährwerte und Preise in Normportion-Logik berechnen. Der Beitrag eines Rezepts zu einer Mahlzeit MUSS dem Normportionwert multipliziert mit `MealItem.factor` entsprechen. Es DARF KEINE Division durch `Recipe.servings` und KEINE Skalierung auf reale Personen-, Aktivitäts- oder Reservemengen (`norm_portions`, `activity_factor`, `reserve_factor`, `override_portions`) in der Regelauswertung erfolgen.

Für gecachte per-100g-Nährwerte MUSS die Umrechnung auf die Normportion `Wert pro 100g × cached_weight_g / 100` lauten. Der Preisbeitrag MUSS `cached_price_total × MealItem.factor` lauten, da `cached_price_total` bereits der Normportionpreis ist.

#### Scenario: Mahlzeitwert aus mehreren Rezepten

- **WHEN** eine Mahlzeit ein Rezept A (protein_g = 10.0 je 100g, cached_weight_g = 300g, factor = 1.0) und ein Rezept B (protein_g = 5.0 je 100g, cached_weight_g = 200g, factor = 0.5) enthält
- **THEN** beträgt der aggregierte Mahlzeit-Eiweißwert `(10.0 × 300/100 × 1.0) + (5.0 × 200/100 × 0.5) = 30.0 + 5.0 = 35.0g`
- **AND** es erfolgt keine Division durch `servings`

#### Scenario: Preis je Normportion mal Faktor

- **WHEN** eine Mahlzeit ein Rezept mit `cached_price_total = 1.20€` und `MealItem.factor = 1.5` enthält
- **THEN** beträgt der Preisbeitrag dieses Rezepts `1.20 × 1.5 = 1.80€`

#### Scenario: Gruppen- und Personen-Skalierung wird ignoriert

- **WHEN** der zugehörige MealPlan `norm_portions = 10`, `activity_factor = 1.5` und `reserve_factor = 1.1` hat
- **THEN** beeinflussen diese Werte die Mahlzeit-, Tages- und Plan-Aggregation für die Regelbewertung NICHT
- **AND** die reale Mengenskalierung bleibt ausschließlich dem Einkaufszettel und den Mengen-/Kosten-Endpunkten vorbehalten

### Requirement: Tages- und Plan-Aggregation in Normportion-Logik

Tages- und Plan-Aggregationen MUST die Normportion-basierten Mahlzeitwerte summieren. Eine zeitliche Mittelung über Tage (Durchschnitt pro Tag) für `scope="meal_event"`-Regeln ist ZULÄSSIG. Eine Division durch reale Personenzahl ist NICHT zulässig. `nutri_class` MUSS als Durchschnitt der vorhandenen Werte aggregiert werden; fehlende oder Null-Werte MÜSSEN ignoriert werden.

#### Scenario: Tagesaggregation summiert Mahlzeiten

- **WHEN** ein Tag drei Mahlzeiten mit aggregierten Eiweißwerten 35.0g, 20.0g und 15.0g enthält
- **THEN** beträgt der Tages-Eiweißwert `70.0g`

#### Scenario: Plan-Tagesdurchschnitt ohne Personen-Division

- **WHEN** eine `scope="meal_event"`-Regel über einen Plan mit 2 Tagen ausgewertet wird und der Gesamt-Energiewert 22.000 kJ beträgt
- **THEN** wertet das System den Tagesdurchschnitt `22.000 / 2 = 11.000 kJ` aus
- **AND** es erfolgt keine zusätzliche Division durch `norm_portions` oder reale Personenzahl

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

