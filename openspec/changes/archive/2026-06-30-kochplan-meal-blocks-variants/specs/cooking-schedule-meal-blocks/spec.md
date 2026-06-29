## ADDED Requirements

### Requirement: Kochplan API liefert geschachtelte Struktur

Der Endpunkt `GET /api/meal-plans/:id/cooking-schedule/` SHALL eine geschachtelte JSON-Struktur zurückgeben: `CookingScheduleOut → days[] → meals[] → recipe_blocks[] → variants[]`.

Die neue Struktur SHALL folgende Felder enthalten:

**CookingScheduleOut:**
- `days: CookingScheduleDayOut[]`
- `excluded_meal_count: int`
- `total_cost_eur: float`
- `total_cost_with_reserve: float`
- `total_energy_kcal: float`
- `norm_portions: int`

**CookingScheduleDayOut:**
- `date: date`
- `meals: CookingScheduleMealOut[]` (ersetzt das flache `items[]`)
- `day_start_time: str`
- `day_end_time: str`
- `day_duration_minutes: int`
- `portions: int`
- `day_nutritional_tags: NutritionalTagOut[]`
- `total_cost_eur: float`
- `total_energy_kcal: float`

**CookingScheduleMealOut:**
- `meal_id: int`
- `meal_type: str`
- `display_name: str`
- `serving_time: datetime`
- `note: str`
- `override_portions: int | None`
- `total_portions: int`
- `recipe_blocks: CookingScheduleRecipeBlockOut[]`

**CookingScheduleRecipeBlockOut:**
- `recipe_id: int`
- `recipe_title: str`
- `recipe_slug: str`
- `recipe_image: str | None`
- `nutritional_tags: NutritionalTagOut[]`
- `variants: CookingScheduleVariantOut[]`

**CookingScheduleVariantOut:**
- `variant_group_id: str | None`
- `display_name: str | None` (z.B. "mit Chili")
- `factor: float`
- `portions: int`
- `active_recipe_item_ids: int[]`
- `lead_minutes: int`
- `start_time: datetime`
- `total_cost_eur: float`
- `total_energy_kcal: float`
- `total_protein_g: float`
- `total_fat_g: float`
- `total_carbohydrate_g: float`
- `steps: str`
- `steps_parsed: CookingScheduleStepOut[]`
- `ingredients: CookingScheduleIngredientOut[]`
- `meal_note: str`

#### Scenario: Vollständiger Kochplan mit Varianten
- **WHEN** ein MealPlan mit 2 Tagen, 3 Mahlzeiten und einem Rezept mit 2 Varianten existiert
- **THEN** der API-Response SHALL eine `days[]`-Liste mit 2 Einträgen enthalten
- **THEN** jeder Day SHALL eine `meals[]`-Liste enthalten
- **THEN** jedes Meal SHALL eine `recipe_blocks[]`-Liste enthalten
- **THEN** der RecipeBlock für das Rezept mit Varianten SHALL `variants[]` mit 2 Einträgen enthalten

#### Scenario: Rezept ohne Varianten
- **WHEN** ein MealItem ohne `variant_group_id` existiert
- **THEN** der RecipeBlock SHALL `variants[]` mit genau 1 Eintrag enthalten
- **THEN** dieser Varianten-Eintrag SHALL `variant_group_id: null` und `display_name: null` haben

#### Scenario: Externe Mahlzeit wird ausgeschlossen
- **WHEN** ein Meal `is_external=true` hat
- **THEN** es SHALL nicht in der Structure erscheinen
- **THEN** `excluded_meal_count` SHALL inkrementiert werden

#### Scenario: Meal ohne Servierzeit wird ausgeschlossen
- **WHEN** ein Meal `start_datetime=null` hat (z.B. Referenz-Mahlzeit)
- **THEN** es SHALL nicht in der Structure erscheinen
- **THEN** `excluded_meal_count` SHALL inkrementiert werden

#### Scenario: Reihenfolge der Meals
- **WHEN** ein Tag mehrere Mahlzeiten hat
- **THEN** die Mahlzeiten SHALL aufsteigend nach `serving_time` sortiert sein
- **THEN** innerhalb einer Mahlzeit SHALL die RecipeBlocks aufsteigend nach `start_time` (früheste Varianten-Startzeit) sortiert sein
- **THEN** innerhalb eines RecipeBlocks SHALL die Varianten aufsteigend nach `start_time` sortiert sein

### Requirement: Varianten-Namen in der API

Jeder `CookingScheduleVariantOut` SHALL das Feld `display_name` enthalten, das aus `MealItem.display_name` übernommen wird.

Ist `MealItem.display_name` leer oder null, SHALL der `display_name` aus den aktiven `RecipeItem`-Namen generiert werden (z.B. "mit Käse, mit Salat") oder null sein, wenn es die einzige Variante ist.

#### Scenario: Display-Name wird durchgereicht
- **WHEN** ein MealItem mit `display_name="mit Chili"` existiert
- **THEN** das entsprechende `CookingScheduleVariantOut` SHALL `display_name="mit Chili"` enthalten

#### Scenario: Single-Variante ohne Display-Name
- **WHEN** ein Rezept ohne Varianten (einzelnes MealItem, `variant_group_id=null`, `display_name=null`) existiert
- **THEN** das `CookingScheduleVariantOut` SHALL `display_name=null` haben

### Requirement: Zutaten-Skalierung berücksichtigt Varianten

`_compute_scaled_ingredients` SHALL einen optionalen Parameter `active_recipe_item_ids: list[int]` akzeptieren.

Wenn `active_recipe_item_ids` gesetzt ist, SHALL die Funktion nur diejenigen `RecipeItem`s einbeziehen, die:
- Keinem `RecipeItemExchangeGroup` angehören, ODER
- Als `is_optional=true` markiert sind UND in `active_recipe_item_ids` enthalten sind, ODER
- Einem `RecipeItemExchangeGroup` angehören UND in `active_recipe_item_ids` enthalten sind

Items ohne Exchange Group, die nicht optional sind, SHALL immer einbezogen werden (sie sind nicht variant-spezifisch).

#### Scenario: Variante filtert Zutaten korrekt
- **WHEN** ein Burger-Rezept mit Exchange-Group (Rinderhack/Veggie-Patty) existiert
- **WHEN** eine Variante `active_recipe_item_ids=[veggie_patty_id, bun_id]` hat
- **THEN** die Ingredients-Liste SHALL "Veggie-Patty" und "Brioche-Bun" enthalten
- **THEN** die Ingredients-Liste SHALL NICHT "Rinderhack" enthalten

#### Scenario: Ohne active_ids werden alle Zutaten einbezogen
- **WHEN** ein MealItem keine `active_recipe_item_ids` gesetzt hat (leere Liste)
- **THEN** ALLE RecipeItems SHALL in der Ingredients-Liste sein (Standard = alle nicht-exchange + exchange_position=0 + optionals)

### Requirement: Kochplan-UI zeigt Meal-Blöcke

Die `CookingSchedulePage` SHALL die API-Daten als optisch getrennte Meal-Blöcke darstellen.

Jeder Meal-Block SHALL enthalten:
- Header mit Meal-Typ-Icon, Meal-Typ-Name, Servierzeit und Gesamt-Portionen
- Eine oder mehrere Recipe-Cards
- Jede Recipe-Card SHALL das Recipe-Bild (falls vorhanden), den Recipe-Titel und Allergen-Badges anzeigen
- Bei mehreren Varianten SHALL jede Variante als Sub-Row mit Startzeit, Dauer, Portionen und Varianten-Name dargestellt werden
- Bei einer einzelnen Variante SHALL die Sub-Row den Recipe-Titel nicht wiederholen (kein "Nudeln · Nudeln")

#### Scenario: Meal mit mehreren Rezepten
- **WHEN** ein Frühstück sowohl "Porridge" als auch "Rührei" enthält
- **THEN** der Frühstücks-Block SHALL zwei Recipe-Cards enthalten
- **THEN** jede Recipe-Card SHALL die zugehörigen Varianten anzeigen

#### Scenario: Varianten-Sub-Rows auf Mobile
- **WHEN** der Viewport 320px breit ist
- **THEN** die Varianten-Sub-Rows SHALL untereinander (nicht nebeneinander) dargestellt werden
- **THEN** Startzeit, Dauer, Portionen und Varianten-Name SHALL in einer Zeile lesbar sein

### Requirement: Varianten-Details ausklappbar

Jede Varianten-Sub-Row SHALL ausklappbar sein, um Zutaten und Zubereitungsschritte anzuzeigen.

Es SHALL immer nur eine Variante gleichzeitig aufgeklappt sein können (accordion-ähnliches Verhalten pro Recipe-Card).

#### Scenario: Varianten-Details auf- und zuklappen
- **WHEN** ein Benutzer auf eine Varianten-Sub-Row klickt
- **THEN** die Zutaten und Schritte dieser Variante SHALL eingeblendet werden
- **WHEN** der Benutzer erneut klickt
- **THEN** die Details SHALL ausgeblendet werden

#### Scenario: Accordion-Verhalten
- **WHEN** Variante A aufgeklappt ist und der Benutzer auf Variante B klickt
- **THEN** Variante A SHALL zugeklappt werden
- **THEN** Variante B SHALL aufgeklappt werden

### Requirement: Keine Datenbank-Migration

Die Änderung SHALL ohne Datenbank-Migration auskommen. Alle benötigten Felder (`meal_id`, `variant_group_id`, `display_name`, `active_recipe_item_ids`) sind bereits im Datenmodell vorhanden.

#### Scenario: Backend verwendet existierende Felder
- **WHEN** das Backend den Cooking-Schedule baut
- **THEN** es SHALL `MealItem.meal_id`, `MealItem.variant_group_id`, `MealItem.display_name` und `MealItem.active_recipe_item_ids` aus der API des bestehenden Datenmodells verwenden
