## ADDED Requirements

### Requirement: ingredient_name in RefMealEditor anzeigen
Das System SHALL in `RefMealEditorPage` (alle Mahlzeittypen) `ingredient_name` anzeigen, wenn ein MealItem kein `display_name` und keine `recipe_id` hat. Die Anzeige-Logik MUSS priorisieren:
1. `display_name` (falls gesetzt)
2. `recipe_title` (falls `recipe_id` gesetzt)
3. `ingredient_name` (falls `ingredient_id` gesetzt)
4. "Unbekanntes Item" (Fallback)

#### Scenario: Ingredient-Item zeigt ingredient_name
- **WHEN** ein MealItem `ingredient_id=42, ingredient_name="Vollkornbrot", recipe_id=null, display_name=null` hat
- **THEN** zeigt die Liste "Vollkornbrot" als Item-Name an

#### Scenario: Recipe-Item zeigt recipe_title
- **WHEN** ein MealItem `recipe_id=123, recipe_title="Rührei"` hat
- **THEN** zeigt die Liste "Rührei" als Item-Name an

#### Scenario: Drink-Item zeigt display_name
- **WHEN** ein MealItem `display_name="Kaffee"` und keine recipe_id hat (Legacy-Daten)
- **THEN** zeigt die Liste "Kaffee" als Item-Name an

### Requirement: MealItemOut liefert ingredient_tags und recipe_type
Das System SHALL `MealItemOut` um zwei Felder erweitern:
- `ingredient_tags: list[str]` — NutritionalTag-Slugs des zugehörigen Ingredients (leer wenn kein ingredient)
- `recipe_type: str` — `recipe.recipe_type` des zugehörigen Rezepts (leer wenn kein recipe)

#### Scenario: Brot-Item hat ingredient_tags
- **WHEN** ein MealItem mit `ingredient_id=42` geladen wird
- **THEN** enthält `ingredient_tags` die Slugs aller NutritionalTags dieses Ingredients (z.B. `["frühstücks-basis"]`)

#### Scenario: Recipe-Item hat recipe_type
- **WHEN** ein MealItem mit `recipe_id=42` geladen wird
- **THEN** ist `recipe_type` der `recipe_type` des Rezepts (z.B. `"drink"` oder `"warm_meal"`)
