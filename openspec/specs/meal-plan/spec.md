# meal-plan Specification

## Purpose
Defines the core data model, creation, and synchronization requirements for Meal Plans and Meals.
## Requirements
### Requirement: Meal plan creation
The system SHALL allow any authenticated user to create a meal plan. The creating user becomes the owner. The MealPlan SHALL support an optional `budget_per_person_per_day` field (DecimalField, nullable).

#### Scenario: Authenticated user creates meal plan
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with valid data
- **THEN** a new meal plan is created with the user as owner

#### Scenario: Authenticated user creates meal plan with budget
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with budget_per_person_per_day=8.00
- **THEN** a new meal plan is created with the budget value persisted

#### Scenario: Anonymous user tries to create meal plan
- **WHEN** unauthenticated user sends POST `/api/meal-plans/`
- **THEN** the system returns 403 Forbidden

### Requirement: Meal Model Felder
Das Meal-Model SHALL die folgenden zusätzlichen Felder haben:
- `is_reference` (BooleanField, default=False): Markiert ein Meal als Referenz-Template
- `ref_meal` (FK zu Meal, nullable): Verweis auf das Referenz-Meal
- `is_synced` (BooleanField, default=False): Ob dieses Meal aktiv mit dem RefMeal synchronisiert ist
- `start_datetime` wird nullable (NULL bei RefMeals)

#### Scenario: RefMeal hat kein Datum
- **WHEN** ein Meal mit `is_reference=True` erstellt wird
- **THEN** ist `start_datetime=NULL` erlaubt

#### Scenario: Normales Meal bleibt unverändert
- **WHEN** ein Meal mit `is_reference=False` existiert
- **THEN** MUSS `start_datetime` weiterhin gesetzt sein

### Requirement: Meal Uniqueness Constraint
Pro MealPlan und meal_type SHALL maximal ein Meal mit `is_reference=True` existieren.

#### Scenario: Unique RefMeal pro Typ
- **WHEN** bereits ein RefMeal (breakfast) für den Plan existiert
- **THEN** wird ein zweites RefMeal (breakfast) für den gleichen Plan mit ValidationError abgelehnt

### Requirement: Configurable day-part factors
The MealPlan model SHALL support configurable day-part factors (`day_part_factors` JSONField) mapping meal types to float factors, defaulting to standard defaults (breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10, dessert=0.00).
When a MealPlan is updated with new factors, all of its associated meals whose factor matches the old factor SHALL automatically be updated to use the new factor.

#### Scenario: MealPlan has default day-part factors
- **WHEN** a new MealPlan is created
- **THEN** it SHALL have the default day-part factors populated: breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10, dessert=0.00

#### Scenario: Updating day-part factors propagates to unmodified meals
- **WHEN** a MealPlan's breakfast day-part factor is updated from 0.25 to 0.30
- **THEN** all associated meals of type breakfast whose current factor is 0.25 SHALL be updated to 0.30, while meals with modified factors remain unchanged

### Requirement: External meals and manual calorie input
The Meal model SHALL support being marked as external (`is_external` BooleanField, default=False) with an optional manual calorie input (`external_energy_kj` in the database, exposed as `external_energy_kcal` in API and UI) and a fixed price per person (`external_cost_per_person` FloatField, nullable).

When a meal is marked as external:
- Its actual energy value SHALL be its manual calorie input if set; otherwise it SHALL automatically default to its target coverage `NORM_PERSON_DAILY_KCAL × day_part_factor` (converted to kJ in the database).
- Its cost SHALL be `external_cost_per_person × effective_portions` (where `effective_portions = override_portions ?? norm_portions`); if `external_cost_per_person` is null, cost SHALL be 0.0.
- Its other nutrients SHALL evaluate to zero.

When evaluating rules (cockpit dashboard) for an external meal, its status SHALL be neutral (green, Soll matches Ist, no warnings triggered).

#### Scenario: External meal without manual calories defaults to target
- **WHEN** a meal has `is_external=True`, `day_part_factor=0.3` and `external_energy_kcal=null`
- **THEN** its aggregated energy SHALL equal `NORM_PERSON_DAILY_KCAL × 0.3` kcal (converted to kJ)

#### Scenario: External meal with manual calories overrides target
- **WHEN** a meal has `is_external=True` and `external_energy_kcal=500`
- **THEN** its aggregated energy value SHALL be exactly 500 kcal (converted to kJ in the database)

#### Scenario: External meal computes cost from fixed price per person
- **WHEN** a meal has `is_external=True`, `external_cost_per_person=12.0`, no override and the plan has `norm_portions=15`
- **THEN** its total cost SHALL be `12.0 × 15 = 180.0` €

#### Scenario: External meal without fixed price has zero cost
- **WHEN** a meal has `is_external=True` and `external_cost_per_person=null`
- **THEN** its total cost SHALL be 0.0

#### Scenario: External meal is neutral in cockpit evaluation
- **WHEN** a meal cockpit is evaluated for an external meal
- **THEN** the status of all evaluated rules SHALL be "green" (neutral) and no warnings or suggestions SHALL be triggered for this meal

### Requirement: MealPlan-Skalierungsmodell ohne Aktivitätsfaktor
Der MealPlan SHALL seine Skalierung ausschließlich über `norm_portions` (Personenanzahl) und `reserve_factor` (Einkaufspuffer) definieren. Die Property `scaling_factor` SHALL `norm_portions × reserve_factor` ergeben. Ein PAL-/Aktivitätsfaktor SHALL kein Bestandteil des MealPlans sein.

#### Scenario: scaling_factor ohne Aktivitätsfaktor
- **WHEN** ein MealPlan `norm_portions = 18` und `reserve_factor = 1.2` hat
- **THEN** liefert `scaling_factor` den Wert `21.6` (= 18 × 1.2)

#### Scenario: scaling_factor ohne Reservepuffer
- **WHEN** ein MealPlan `norm_portions = 18` und `reserve_factor = 1.0` hat
- **THEN** liefert `scaling_factor` den Wert `18.0`

#### Scenario: MealPlan-Erstellung ohne activity_factor
- **WHEN** ein authentifizierter Nutzer POST `/api/meal-plans/` mit `norm_portions` und `reserve_factor` sendet
- **THEN** wird der MealPlan erstellt und das Request-Schema SHALL kein `activity_factor`-Feld akzeptieren oder erwarten

### Requirement: Drinks meal type
The Meal model SHALL support a `drinks` meal type (`MealTypeChoices.DRINKS`) with a default `day_part_factor` of 0.0. The `drinks` type SHALL be included in `DEFAULT_MEAL_TYPES` so that newly created days automatically receive a drinks slot, and in `MEAL_TYPE_DEFAULT_TIMES`. Existing meal plans SHALL NOT be retroactively migrated to add drinks slots.

#### Scenario: New day auto-creates a drinks slot
- **WHEN** a new day is added to a meal plan
- **THEN** a meal of type `drinks` SHALL be created automatically with `day_part_factor=0.0`

#### Scenario: Existing plans are not migrated
- **WHEN** the change is deployed
- **THEN** no data migration SHALL add drinks slots to days that existed before; they remain addable via the existing add-meal action


