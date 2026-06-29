# meal-cockpit Specification

## Purpose
Defines legacy cockpit migration state and nutrition aggregation behavior used by meal planning suggestions.

## Legacy Migrations
### Legacy Migration: HealthRule data model
**Reason**: Replaced by unified `Rule` model in `meal-plan-suggestions` capability.
**Migration**: All HealthRule data migrated to Rule model via data migration. Fields mapped: threshold_green → max_green, threshold_yellow → max_yellow (for max rules) or min_green/min_yellow (for min rules). rule_type set to "nutrition".

### Legacy Migration: Health rules API
**Reason**: Replaced by `/api/rules/` endpoint in `meal-plan-suggestions` capability.
**Migration**: Frontend consumers switch from `/api/health-rules/` to `/api/rules/`.

### Legacy Migration: MealEvent cockpit API
**Reason**: Replaced by `/api/meal-plans/{id}/suggestions/` endpoint in `meal-plan-suggestions` capability.
**Migration**: Frontend switches from cockpit hooks to suggestions hooks.

### Legacy Migration: Traffic light indicators in UI
**Reason**: Ampel indicators are preserved but moved into the Vorschläge tab. Standalone cockpit tab removed.
**Migration**: TrafficLightIndicator component reused in SuggestionDashboard.

### Legacy Migration: Health tips display
**Reason**: Tips are now part of suggestion cards in the Vorschläge tab.
**Migration**: tip_text field preserved on Rule model, shown in suggestion cards.

### Legacy Migration: Cockpit summary card
**Reason**: Replaced by suggestion summary in the Vorschläge tab badge and header.
**Migration**: Summary status logic preserved in suggestion service.

### Legacy Migration: Cockpit evaluates vitamin and mineral health rules
**Reason**: Vitamin/mineral evaluation preserved in the unified Rule system.
**Migration**: All vitamin/mineral HealthRules migrated to Rules with scope and parameters intact.

### Legacy Migration: HealthRule admin interface
**Reason**: Replaced by unified "Regeln" admin tab in `meal-plan-suggestions` capability.
**Migration**: Django admin registration updated for Rule model.
## Requirements
### Requirement: Portion-based nutrition cockpit aggregation
The cockpit aggregation service SHALL calculate nutritional values in Normportion logic by scaling each recipe's cached per-100g values using the recipe's cached weight and the meal item's planned factor. Since every recipe represents exactly one Normportion, `Recipe.servings` is always treated as `1` and there SHALL be no division by `servings`.

#### Scenario: Aggregating meal values in Normportion logic
- **WHEN** a meal has a meal item for a recipe with cached_protein_g = 10.0g (per 100g), cached_weight_g = 800g, and meal item factor = 1.5
- **THEN** the aggregated meal protein contribution SHALL be calculated as 10.0 × (800 / 100.0) × 1.5 = 120.0g
- **AND** there SHALL be no division by `servings`

### Requirement: Normportion-basierte Mahlzeit-Aggregation

Die Aggregations-Services für Mahlzeit-, Tages- und Plan-Scope MUST Nährwerte und Preise in Normportion-Logik berechnen. Der Beitrag eines Rezepts zu einer Mahlzeit MUSS dem Normportionwert multipliziert mit `MealItem.factor` entsprechen. Es DARF KEINE Division durch `Recipe.servings` und KEINE Skalierung auf reale Personen-, Aktivitäts- oder Reservemengen (`norm_portions`, `activity_factor`, `reserve_factor`, `override_portions`) in der Regelauswertung erfolgen.

Wenn ein Rezept einen gültigen Cache hat (`cached_at` gesetzt), MUSS der Aggregations-Service die Nährwerte dennoch **Item-für-Item aus den `RecipeItem`-Zeilen recomputen**, um `MealItemOverride` korrekt anwenden zu können. Der `cached_price_total` bleibt als Preis-Referenz erhalten, da auf RecipeItem-Ebene kein Einzelpreis vorliegt.

Für die Item-für-Item-Berechnung gilt: `weight_g = effective_quantity × portion.weight_g`, `nutrient_scale = weight_g / 100 × item.factor`.

#### Scenario: Mahlzeitwert aus mehreren Rezepten

- **WHEN** eine Mahlzeit ein Rezept A (protein_g = 10.0 je 100g, cached_weight_g = 300g, factor = 1.0) und ein Rezept B (protein_g = 5.0 je 100g, cached_weight_g = 200g, factor = 0.5) enthält
- **THEN** beträgt der aggregierte Mahlzeit-Eiweißwert `(10.0 × 300/100 × 1.0) + (5.0 × 200/100 × 0.5) = 30.0 + 5.0 = 35.0g`
- **AND** es erfolgt keine Division durch `servings`

#### Scenario: MealItemOverride wird im Cockpit berücksichtigt

- **GIVEN** ein Rezept mit Zutat A (50g, energy_kcal=200/100g) und Zutat B (100g, energy_kcal=300/100g)
- **AND** ein `MealItemOverride` mit `excluded=True` für Zutat B
- **WHEN** die Cockpit-Aggregation die Mahlzeit auswertet
- **THEN** beträgt der Energiebeitrag nur `200/100 × 50 = 100 kcal` (ohne Zutat B)
- **AND** Zutat B erscheint nicht in der Aggregation

#### Scenario: Preis je Normportion mal Faktor

- **WHEN** eine Mahlzeit ein Rezept mit `cached_price_total = 1.20€` und `MealItem.factor = 1.5` enthält
- **THEN** beträgt der Preisbeitrag dieses Rezepts `1.20 × 1.5 = 1.80€`

#### Scenario: Gruppen- und Personen-Skalierung wird ignoriert

- **WHEN** der zugehörige MealPlan `norm_portions = 10`, `activity_factor = 1.5` und `reserve_factor = 1.1` hat
- **THEN** beeinflussen diese Werte die Mahlzeit-, Tages- und Plan-Aggregation für die Regelbewertung NICHT
- **AND** die reale Mengenskalierung bleibt ausschließlich dem Einkaufszettel und den Mengen-/Kosten-Endpunkten vorbehalten

### Requirement: Tages- und Plan-Aggregation in Normportion-Logik

Tages- und Plan-Aggregationen MUST die Normportion-basierten Mahlzeitwerte summieren. Eine zeitliche Mittelung über Tage (Durchschnitt pro Tag) für `scope="meal_event"`-Regeln ist ZULÄSSIG. Eine Division durch reale Personenzahl ist NICHT zulässig. `nutri_class` MUSS als Durchschnitt der vorhandenen Werte aggregiert werden; fehlende oder Null-Werte MÜSSEN ignoriert werden. Energie-Werte MUST vor der Auswertung gegen Energie-Regeln von kJ nach kcal konvertiert werden (`/ 4,184`), sodass Wert und Schwellwert in derselben Einheit (kcal) verglichen werden. Die Regelauswertung MUST zusätzlich die Soll-Grenzwerte `min_green` und `max_green` sowie den abgeleiteten Mittelwert `target_mid` für jede bewertete Regel zurückgeben, sofern diese definiert sind. Bei scope="day"-Regelauswertung MÜSSEN die Schwellwerte mit `effectiveCoverage` multipliziert werden.

#### Scenario: Tagesaggregation summiert Mahlzeiten

- **WHEN** ein Tag drei Mahlzeiten mit aggregierten Eiweißwerten 35.0g, 20.0g und 15.0g enthält
- **THEN** beträgt der Tages-Eiweißwert `70.0g`

#### Scenario: Plan-Tagesdurchschnitt ohne Personen-Division

- **WHEN** eine `scope="meal_event"`-Regel über einen Plan mit 2 Tagen ausgewertet wird und der Gesamt-Energiewert 22.000 kJ beträgt
- **THEN** wertet das System den Tagesdurchschnitt `22.000 / 2 = 11.000 kJ` aus, konvertiert diesen zu `11.000 / 4,184 ≈ 2629 kcal` und wertet ihn gegen die kcal-Energieregel aus
- **AND** es erfolgt keine zusätzliche Division durch `norm_portions` oder reale Personenzahl

#### Scenario: Regelauswertung liefert Soll-Band-Felder
- **WHEN** eine Regel mit `min_green = 2000` und `max_green = 2500` gegen einen Wert ausgewertet wird
- **THEN** gibt das System die Auswertung mit `min_green` = 2000.0, `max_green` = 2500.0 und `target_mid` = 2250.0 aus

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

### Requirement: Coverage-skalierte day-level Regelauswertung

Das Suggestion-System SHALL bei der Auswertung von day-level HealthRules die effektive Tagesabdeckung (`effectiveCoverage`) berücksichtigen. Die Schwellwerte der Regel (min_green, max_green, min_yellow, max_yellow) werden mit `effectiveCoverage` multipliziert, bevor die Regel gegen den aggregierten Tageswert ausgewertet wird.

#### Scenario: Protein-Regel an Tag mit 50% Coverage
- **WHEN** eine day-level Regel "protein_g: min_green=45, min_yellow=35" ausgewertet wird
- **AND** der Tag hat 50% Coverage (effectiveCoverage = 0.50)
- **THEN** werden die Schwellwerte skaliert: min_green=22.5, min_yellow=17.5
- **THEN** wird der Ist-Wert (z.B. 30g) gegen die skalierten Schwellwerte ausgewertet

#### Scenario: Energie-Regel an Tag mit 25% Coverage (Floor greift)
- **WHEN** eine day-level Regel "energy_kj: max_green=10500, max_yellow=13000" ausgewertet wird
- **AND** der Tag hat 25% Coverage (effectiveCoverage = max(0.25, 0.35) = 0.35)
- **THEN** werden die Schwellwerte skaliert: max_green=3675, max_yellow=4550
- **THEN** der Floor von 35% verhindert übermäßige Skalierung

#### Scenario: Vollständiger Tag ohne Skalierung
- **WHEN** eine day-level Regel an einem Tag mit 100% Coverage ausgewertet wird
- **THEN** werden die Schwellwerte NICHT skaliert (effektiv × 1.0)

### Requirement: Coverage-Information im Suggestion-Response

Das Suggestion-System SHALL für jeden day-level Vorschlag einen `coverage`-Wert im Response mitliefern, sodass das Frontend den Coverage-Kontext anzeigen kann.

#### Scenario: Suggestion-Card zeigt Coverage
- **WHEN** eine day-level Suggestion-Card im Vorschläge-Tab angezeigt wird
- **THEN** zeigt die Card einen Coverage-Badge mit der Tagesabdeckung
- **THEN** bei skalierter Regel wird ein Hinweis "Skaliert auf X % Tagesabdeckung" angezeigt

### Requirement: NutritionView separates day-sum and event-average rules visually

The NutritionView component in the MealPlan UI SHALL display rules in two distinct visual sections:

1. **"Summe pro Tag"** — Shows `scope=day` rules. Each day with meals SHALL have its own rule evaluation displayed. When a specific day is selected via the day selector, only that day's evaluations SHALL be shown.
2. **"Durchschnitt pro Tag (Ø Plan)"** — Shows `scope=meal_event` rules. SHALL always display the daily average across all days. This section SHALL be hidden when a specific single day is selected (since sum = average for one day).

Each section SHALL have a distinct header with an icon and label indicating the evaluation mode (Summe vs. Durchschnitt). Rules within each section SHALL use `SollIstBar` with a `scopeLabel` indicating the context.

#### Scenario: Both sections visible when viewing entire plan

- **WHEN** the NutritionView is displayed for a MealPlan with 3 days
- **AND** the user has selected "Gesamter Plan (3 Tage)" in the day selector
- **THEN** a "Summe pro Tag" section SHALL render day-level rules for each of the 3 days
- **AND** a "Durchschnitt pro Tag (Ø Plan)" section SHALL render meal_event-level rules with the daily average

#### Scenario: Only sum section visible when viewing a specific day

- **WHEN** the NutritionView is displayed for a MealPlan with 3 days
- **AND** the user has selected a specific day (e.g. "Mo 01.06") in the day selector
- **THEN** the "Summe pro Tag" section SHALL render only that day's rules
- **AND** the "Durchschnitt pro Tag (Ø Plan)" section SHALL be hidden

#### Scenario: Day rules are not found when no day-scope rules exist

- **WHEN** no active `scope=day` rules exist for a given parameter
- **THEN** the "Summe pro Tag" section SHALL still display using the built-in fallback rules (`NUTRITION_FALLBACKS`) as day rules

#### Scenario: Meal_event rules are not found when no meal_event-scope rules exist

- **WHEN** no active `scope=meal_event` rules exist for a given parameter
- **THEN** the "Durchschnitt pro Tag (Ø Plan)" section SHALL still display using the built-in fallback rules as meal_event rules

### Requirement: NutritionView day rules show per-day context labels

For each day in the "Summe pro Tag" section, each rule's `SollIstBar` SHALL receive a `scopeLabel` in the format "Summe Tag {N}" where N is the 1-indexed day number. The label SHALL include the formatted date for additional context.

#### Scenario: Day rule with scope label

- **WHEN** day 2 of a plan has an energy evaluation of 1800 kcal
- **AND** the formatted date is "Di 02.06"
- **THEN** the SollIstBar SHALL render with `scopeLabel="Summe Tag 2 (Di 02.06)"`

### Requirement: NutritionView meal_event rules show average context label

For each rule in the "Durchschnitt pro Tag (Ø Plan)" section, each rule's `SollIstBar` SHALL receive a `scopeLabel` in the format "Ø {N} Tage" where N is the number of days in the plan.

#### Scenario: Event rule with scope label

- **WHEN** a meal plan has 5 days and the energy average is 1880 kcal
- **THEN** the SollIstBar SHALL render with `scopeLabel="Ø 5 Tage"`

#### Scenario: Single-day plan average label

- **WHEN** a meal plan has only 1 day
- **THEN** the SollIstBar SHALL render with `scopeLabel="1 Tag"`
