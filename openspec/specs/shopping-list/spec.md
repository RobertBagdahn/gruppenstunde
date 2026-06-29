## MODIFIED Requirements

### Requirement: Shopping list creation
The system SHALL allow any authenticated user to create a shopping list. The creating user becomes the owner.

#### Scenario: Authenticated user creates shopping list
- **WHEN** an authenticated user sends POST `/api/shopping-lists/` with valid data
- **THEN** a new shopping list is created with the user as owner

#### Scenario: Anonymous user tries to create shopping list
- **WHEN** an unauthenticated user sends POST `/api/shopping-lists/`
- **THEN** the system returns 403 Forbidden

### Requirement: Shopping list visibility
The system SHALL return only shopping lists that the requesting user owns or is a collaborator on. Staff users SHALL see all shopping lists.

#### Scenario: User lists their shopping lists
- **WHEN** an authenticated user requests GET `/api/shopping-lists/`
- **THEN** the system returns only shopping lists where the user is owner or collaborator

#### Scenario: Staff lists all shopping lists
- **WHEN** a staff user requests GET `/api/shopping-lists/`
- **THEN** the system returns all shopping lists

### Requirement: Shopping-Service defensive Normalisierung
Der Shopping-Service SHALL bei der Mengenberechnung den `scaling`-Faktor als `meal_plan.scaling_factor = norm_portions × reserve_factor` verwenden (ohne Aktivitäts-/PAL-Faktor) und defensiv durch `recipe.servings` teilen, um korrekte Einkaufsmengen zu gewährleisten auch wenn ein Rezept `servings != 1` hat.

#### Scenario: Einkaufsliste aus Essensplan mit normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=1` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 1` ergeben, wobei `scaling = norm_portions × reserve_factor`

#### Scenario: Einkaufsliste aus Essensplan mit nicht-normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=4` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 4` ergeben, wobei `scaling = norm_portions × reserve_factor`

#### Scenario: Einkaufsmenge enthält keinen PAL-Faktor
- **WHEN** ein Essensplan `norm_portions = 18` und `reserve_factor = 1.2` hat und ein Rezept (`servings=1`, `factor=1`) `300 g` einer Zutat pro Portion enthält
- **THEN** die aggregierte Einkaufsmenge dieser Zutat SHALL `300 × 18 × 1.2 = 6480 g` betragen (kein zusätzlicher Aktivitätsfaktor)

#### Scenario: Einkaufsliste aus einzelnem Rezept
- **WHEN** eine Einkaufsliste direkt aus einem Rezept generiert wird
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * servings / recipe.servings` ergeben

## ADDED Requirements

### Requirement: Shopping List Direct Single-Ingredient Aggregation
The system SHALL aggregate and include direct single-ingredient items (`MealItem.ingredient`) in the generated shopping list, calculated using the correct quantities and portions.

#### Scenario: Generate shopping list with direct ingredient
- **WHEN** the user generates a shopping list from a meal plan containing a meal item with a direct ingredient and no recipe
- **THEN** the shopping list includes that ingredient with its scaled quantity.

### Requirement: Meal-Level Portion Override Scaling
The system SHALL calculate ingredient quantities in the shopping list by prioritizing the meal-level `override_portions` if set, rather than applying the global plan-level scaling factor.

#### Scenario: Generate shopping list with meal portion override
- **WHEN** the user generates a shopping list from a meal plan where a meal has `override_portions = 15` and the global plan has `portions = 10` (with reference portions = 10)
- **THEN** the system scales the ingredients for that meal by `1.5` instead of `1.0`.

### Requirement: Shopping List Respects MealItemOverride

Die Einkaufslisten-Generierung MUSS `MealItemOverride` pro MealItem anwenden, bevor Mengen aggregiert werden.

#### Scenario: Excluded RecipeItem fehlt auf Einkaufsliste
- **GIVEN** ein `MealItem` mit Rezept, das Zutat A und Zutat B enthält
- **AND** ein `MealItemOverride` mit `excluded=True` für Zutat B
- **WHEN** die Einkaufsliste generiert wird
- **THEN** erscheint Zutat B **nicht** auf der Einkaufsliste

#### Scenario: quantity_override reduziert Einkaufsmenge
- **GIVEN** ein RecipeItem mit `quantity=4` (→ 240g) und ein `MealItemOverride` mit `quantity_override=2`
- **WHEN** die Einkaufsliste generiert wird
- **THEN** wird `weight_g = 2 × portion.weight_g × factor × meal_scaling` verwendet (nicht 4)

#### Scenario: Konsistenz zwischen Einkaufsliste und Nährwert-Summary nach Override
- **GIVEN** ein Override der die Menge halbiert (`quantity_override = original/2`)
- **WHEN** sowohl Einkaufsliste als auch `nutrition_summary` berechnet werden
- **THEN** ist `shopping_weight = nutrition_weight_per_person × norm_portions × reserve_factor` (beide halbiert)

### Requirement: display_quantity mit Packungsoptionen
Das `display_quantity`-Feld auf `ShoppingListItemOut` MUST erweitert werden um Packungsoptionen, sofern solche für das verknüpfte Ingredient definiert sind. Das Format ist `"{gramm} · {n}×{packung1} · {m}×{packung2}"`.

#### Scenario: display_quantity ohne Packungen
- **WHEN** das Ingredient keine Packungsportionen hat
- **THEN** MUST `display_quantity` nur den Gramm-Wert enthalten (wie bisher): `"750g"`

#### Scenario: display_quantity mit einer Packungsgröße
- **WHEN** das Ingredient eine Packungsportion hat (z.B. 250g Packung)
- **THEN** MUST `display_quantity` das erweiterte Format enthalten: `"750g · 3×250g"`

#### Scenario: display_quantity mit mehreren Packungsgrößen
- **WHEN** das Ingredient mehrere Packungsportionen hat (z.B. 250g und 500g)
- **THEN** MUST `display_quantity` alle Optionen enthalten: `"750g · 3×250g · 2×500g"`

#### Scenario: Bestehende Felder bleiben erhalten
- **WHEN** die API aufgerufen wird
- **THEN** MUST `natural_portions`, `portion_options` und alle anderen bisherigen Felder unverändert erhalten bleiben (kein Breaking Change)
