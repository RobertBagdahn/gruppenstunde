# meal-plan Specification — Delta

## REMOVED Requirements

### Requirement: Drinks meal type

**Reason**: `drinks` als MealTypeChoice entfernt, Snack wird zum flexiblen Sammel-Typ. Getränke werden als snack-Meals mit `day_part_factor=0.00` abgebildet.

**Migration**: Alle bestehenden `meal_type='drinks'` werden in der Datenmigration zu `meal_type='snack'` mit `day_part_factor=0.00` und `display_name='Getränke'`.

## MODIFIED Requirements

### Requirement: Configurable day-part factors

The MealPlan model SHALL support configurable day-part factors (`day_part_factors` JSONField) mapping meal types to float factors, defaulting to standard defaults (breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10).

When a MealPlan is updated with new factors, the factors SHALL NOT automatically propagate to existing meals. Each meal maintains its own `day_part_factor` independently.

#### Scenario: MealPlan has default day-part factors
- **WHEN** a new MealPlan is created
- **THEN** it SHALL have the default day-part factors populated: breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10

#### Scenario: Updating day-part factors does NOT propagate
- **WHEN** a MealPlan's breakfast day-part factor is updated from 0.25 to 0.30
- **THEN** existing meals of type breakfast SHALL retain their current `day_part_factor` values unchanged

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

## ADDED Requirements

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
