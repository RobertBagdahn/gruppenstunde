## MODIFIED Requirements

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
