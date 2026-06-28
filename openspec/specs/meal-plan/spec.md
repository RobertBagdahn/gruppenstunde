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
- `display_name` (CharField, max_length=200, blank=True, default=""): Benutzerdefinierter Anzeigename (z.B. "Kaffee", "Saft")

#### Scenario: RefMeal hat kein Datum
- **WHEN** ein Meal mit `is_reference=True` erstellt wird
- **THEN** ist `start_datetime=NULL` erlaubt

#### Scenario: Normales Meal bleibt unverändert
- **WHEN** ein Meal mit `is_reference=False` existiert
- **THEN** MUSS `start_datetime` weiterhin gesetzt sein

#### Scenario: Meal mit display_name
- **WHEN** ein Meal mit `meal_type='snack'` und `display_name='Kaffee'` erstellt wird
- **THEN** wird `display_name='Kaffee'` in der API persistiert und ausgeliefert

#### Scenario: Meal ohne display_name
- **WHEN** ein Meal ohne `display_name` (Default "") erstellt wird
- **THEN** wird im Frontend der Meal-Type-Label ("Snack") als Anzeigename verwendet

### Requirement: Meal Uniqueness Constraint

Pro MealPlan und meal_type SHALL maximal ein Meal mit `is_reference=True` existieren.
Für reguläre Meals (is_reference=False) gilt:
- `breakfast`, `lunch`, `dinner`: maximal ein Meal pro Tag und Typ
- `snack`: KEINE Unique-Beschränkung — mehrere snack-Meals pro Tag erlaubt

#### Scenario: Unique RefMeal pro Typ
- **WHEN** bereits ein RefMeal (breakfast) für den Plan existiert
- **THEN** wird ein zweites RefMeal (breakfast) für den gleichen Plan mit ValidationError abgelehnt

#### Scenario: Mehrere Snacks pro Tag erlaubt
- **WHEN** bereits ein snack-Meal am 2026-06-07 existiert
- **THEN** kann ein zweites snack-Meal am gleichen Tag ohne Fehler erstellt werden

#### Scenario: Doppeltes Frühstück abgelehnt
- **WHEN** bereits ein breakfast-Meal am 2026-06-07 existiert
- **THEN** wird ein zweites breakfast-Meal am gleichen Tag mit ValidationError abgelehnt

### Requirement: Configurable day-part factors

The MealPlan model SHALL support configurable day-part factors (`day_part_factors` JSONField) mapping meal types to float factors, defaulting to standard defaults (breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10).

When a MealPlan is updated with new factors, the factors SHALL NOT automatically propagate to existing meals. Each meal maintains its own `day_part_factor` independently.

#### Scenario: MealPlan has default day-part factors
- **WHEN** a new MealPlan is created
- **THEN** it SHALL have the default day-part factors populated: breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10

#### Scenario: Updating day-part factors does NOT propagate
- **WHEN** a MealPlan's breakfast day-part factor is updated from 0.25 to 0.30
- **THEN** existing meals of type breakfast SHALL retain their current `day_part_factor` values unchanged

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

### Requirement: MealPlan Default-Uhrzeiten konfigurierbar

Der MealPlan SHALL ein `meal_default_times` JSONField speichern, das die Standard-Start- und End-Uhrzeiten pro Mahlzeit-Typ definiert. Format: `Record<string, [string, string]>` (z.B. `{"breakfast": ["08:00", "09:00"]}`).

Default-Werte:
- breakfast: ["08:00", "09:00"]
- lunch: ["12:00", "13:00"]
- dinner: ["18:00", "19:00"]
- snack: ["15:00", "15:30"]

#### Scenario: Neuer Plan hat Default-Uhrzeiten
- **WHEN** ein neuer MealPlan erstellt wird
- **THEN** enthält `meal_default_times` die Standard-Uhrzeiten für alle 4 Mahlzeit-Typen

#### Scenario: Default-Uhrzeiten überschreiben
- **WHEN** der User `meal_default_times` im Settings-Panel auf `{"breakfast": ["09:00", "10:00"]}` setzt
- **THEN** wird dieser Wert im API-Response zurückgegeben

#### Scenario: Neue Meals verwenden Plan-Default-Uhrzeiten
- **WHEN** ein Meal für einen Tag erstellt wird
- **THEN** verwendet das neue Meal die `meal_default_times` des Plans für seine `start_datetime`/`end_datetime`

### Requirement: DEFAULT_MEAL_TYPES auf 4 reduziert

Das `DEFAULT_MEAL_TYPES`-Array SHALL nur noch `[breakfast, lunch, dinner, snack]` enthalten. Neue Tage erhalten standardmäßig ein snack-Meal statt snack + drinks.

#### Scenario: Neuer Tag erzeugt nur einen Snack
- **WHEN** ein neuer Tag zu einem Plan hinzugefügt wird
- **THEN** wird genau ein Meal vom Typ `snack` erzeugt (statt snack + drinks)

### Requirement: Kcal-Berechnung ohne Drinks-Sonderbehandlung

Meals SHALL unabhängig von ihrem `meal_type` normal in der Kcal-Berechnung behandelt werden. Der bisherige Check `meal_type == 'drinks' → total_energy_kj = 0` entfällt. Getränke mit `day_part_factor=0.00` haben ein Soll-Kcal-Ziel von 0.

#### Scenario: Snack-Meal mit Getränke-Items hat normale Kcal
- **WHEN** ein snack-Meal mit `day_part_factor=0.00` und Items mit kcal-Werten existiert
- **THEN** wird `total_energy_kj` normal aus den Items berechnet (nicht auf 0 gesetzt)

### Requirement: display_name im API-Schema

Das `MealOut` Pydantic-Schema SHALL ein `display_name: str` Feld enthalten. Das `MealCreateIn` und `MealUpdateIn` Schema SHALL optionale `display_name: str | None = None` Felder enthalten.

#### Scenario: display_name im MealOut
- **WHEN** ein Meal `display_name='Kaffee'` hat
- **THEN** enthält der API-Response `display_name: 'Kaffee'`

### Requirement: meal_default_times im API-Schema

Das `MealPlanDetailOut` Pydantic-Schema SHALL ein `meal_default_times: dict[str, list[str]]` Feld enthalten. Das `MealPlanUpdateIn` Schema SHALL ein optionales `meal_default_times: dict[str, list[str]] | None = None` Feld enthalten.

#### Scenario: meal_default_times im MealPlanDetailOut
- **WHEN** ein MealPlan mit Default-Uhrzeiten abgerufen wird
- **THEN** enthält der API-Response `meal_default_times: {"breakfast": ["08:00", "09:00"], ...}`

### Requirement: MealPlan nutritional tags

The MealPlan model SHALL have a `nutritional_tags` M2M field to `supply.NutritionalTag`. All NutritionalTag records SHALL be assignable. MealPlan nutritional tags represent **exclusion criteria** (Verbote) — assigned tags indicate ingredients or properties that SHALL NOT appear in the plan's meals.

The RecipeSearch and RecipeSuggestions APIs SHALL support excluding recipes that match the plan's nutritional tags via `exclude_nutritional_tag_ids` parameter.

#### Scenario: Create MealPlan with nutritional tags
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with `nutritional_tag_ids: [1, 2]` (e.g. Erdnuss + Milch)
- **THEN** the MealPlan is created with both tags assigned as exclusions

#### Scenario: Recipe search excludes tagged recipes
- **WHEN** a user searches recipes with `exclude_nutritional_tag_ids=[1,2]`
- **THEN** recipes containing NutritionalTag 1 or 2 SHALL NOT appear in results

#### Scenario: Recipe suggestions exclude tagged recipes
- **WHEN** recipe suggestions are requested for a MealPlan with nutritional tags
- **THEN** recipes matching any of the plan's nutritional tags SHALL be excluded from suggestions

#### Scenario: Update MealPlan nutritional tags
- **WHEN** an authenticated user sends PATCH `/api/meal-plans/{id}/` with `nutritional_tag_ids: [3]`
- **THEN** the MealPlan's nutritional tags are updated to only contain tag ID 3

#### Scenario: List MealPlan includes nutritional tag IDs and names
- **WHEN** GET `/api/meal-plans/` is called
- **THEN** each MealPlan in the response SHALL include `nutritional_tag_ids: [...]` and `nutritional_tag_names: [...]`

#### Scenario: MealPlan detail includes nutritional tags with full objects
- **WHEN** GET `/api/meal-plans/{id}/` is called
- **THEN** the response SHALL include `nutritional_tag_ids: [int, ...]` and `nutritional_tags: [NutritionalTagOut, ...]`

### Requirement: Recipe Suggestions exclude plan nutritional tags

The recipe suggestion system SHALL filter out recipes that have nutritional tags matching the meal plan's nutritional tags. When `exclude_nutritional_tag_ids` is provided, the API SHALL exclude recipes with those tags.

#### Scenario: Suggestions exclude tagged recipes via API parameter
- **WHEN** `GET /meal-plans/recipes/suggestions/?exclude_nutritional_tag_ids=1,2` is called
- **THEN** only recipes NOT containing tags 1 or 2 SHALL be returned

#### Scenario: Random recipe suggestion excludes tagged recipes
- **WHEN** `GET /meal-plans/recipes/suggestions/?random=true&exclude_nutritional_tag_ids=1` is called
- **THEN** the random suggestion SHALL NOT have nutritional tag 1

### Requirement: Nutritional tag selection in MealPlan create dialog

The MealPlan create dialog SHALL allow selecting nutritional tags during creation, not only after creation via settings.

#### Scenario: Create dialog shows tag picker
- **WHEN** the "Neuer Essensplan" dialog is opened
- **THEN** a `NutritionalTagMultiSelect` component SHALL be visible allowing tag selection

#### Scenario: Tags sent during creation
- **WHEN** the user selects tags in the create dialog and clicks "Erstellen"
- **THEN** `nutritional_tag_ids` SHALL be included in the POST body

### Requirement: Settings panel uses NutritionalTagMultiSelect

The MealPlan settings panel SHALL use the shared `NutritionalTagMultiSelect` component for tag selection instead of a custom button-based UI. All nutritional tags SHALL be selectable (no `is_dangerous` filter).

#### Scenario: Settings panel shows all tags
- **WHEN** the settings panel is opened
- **THEN** all nutritional tags (dangerous and non-dangerous) SHALL be displayed in the tag picker

#### Scenario: Tag changes are saved
- **WHEN** the user modifies tag selection in settings and clicks "Speichern"
- **THEN** the updated `nutritional_tag_ids` SHALL be sent via PATCH

### Requirement: Allergen scan checks all nutritional tags

The allergen scan endpoint SHALL compare ALL `nutritional_tags` of assigned recipes against the plan's `nutritional_tags`. The `is_dangerous` filter on recipe tags SHALL be removed — every matching tag SHALL be reported as a violation.

#### Scenario: Non-dangerous tag match triggers violation
- **WHEN** a MealPlan has `nutritional_tags = [vegan]` and an assigned recipe has `nutritional_tags = [vegan]`
- **THEN** the scan SHALL report a violation for that recipe, even though `vegan` has `is_dangerous=False`

#### Scenario: Scan returns all plan nutritional tags
- **WHEN** GET `/api/meal-plans/{id}/allergen-scan/` is called
- **THEN** the response `allergen_tags` field SHALL contain all `nutritional_tags` of the plan (not only dangerous ones)

### Requirement: Ingredient items have editable factor field in meal slots

Standalone ingredient items (MealItems with `ingredient_id` and no `recipe_id`) SHALL display an editable FactorInput alongside their quantity when `canEdit` is true and the meal is not synced. The FactorInput SHALL allow adjusting the `factor` field via the existing `PATCH /api/meal-plans/{id}/meal-items/{itemId}/` endpoint.

The FactorInput SHALL use `toFixed(2)` precision (not `toFixed(1)`) to preserve factor values through edit round-trips without silent precision loss.

#### Scenario: Ingredient item shows editable FactorInput
- **WHEN** a standalone ingredient item exists in an editable, non-synced meal slot
- **THEN** the item SHALL show the FactorInput alongside the quantity display (e.g. `×6000 g  ×[1,00]`)

#### Scenario: Ingredient item FactorInput saves via PATCH
- **WHEN** the user types `0,5` into the FactorInput of an ingredient item and presses Enter
- **THEN** the PATCH endpoint is called with `{ factor: 0.5 }` and the kcal display updates

#### Scenario: FactorInput preserves two decimal places
- **WHEN** the backend returns `factor=0.753`
- **THEN** the displayed value SHALL be `0,75` (not rounded to `0,8`)
- **AND** when the user saves without editing, the factor SHALL remain `0.753`

### Requirement: Read-only ingredient items show factor and quantity

When ingredient items are displayed in read-only mode (cannot edit or meal is synced), the layout SHALL show both the quantity AND the factor (if not 1.0), using the same precision as the editable version.

#### Scenario: Read-only ingredient shows factor
- **WHEN** a read-only meal slot displays an ingredient item with `factor=2.0`
- **THEN** the display SHALL show `×6000 g  ×2,00` (both quantity and factor visible)
