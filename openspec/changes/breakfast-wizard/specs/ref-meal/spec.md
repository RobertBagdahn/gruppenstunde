## MODIFIED Requirements

### Requirement: RefMeal erstellen
Das System SHALL erlauben, pro MealPlan und meal_type maximal ein RefMeal (Meal mit `is_reference=True`) zu erstellen. Ein RefMeal hat keinen konkreten Zeitpunkt (`start_datetime=NULL`). Für `meal_type=breakfast` SHALL das RefMeal erst beim Abschluss des Frühstücks-Wizards erstellt werden, nicht beim Öffnen.

#### Scenario: RefMeal für Frühstück erstellen
- **WHEN** User ein RefMeal mit `meal_type=breakfast` für einen MealPlan erstellt
- **THEN** wird ein Meal mit `is_reference=True`, `start_datetime=NULL` und dem angegebenen `meal_type` erstellt

#### Scenario: Duplikat verhindern
- **WHEN** bereits ein RefMeal mit `meal_type=breakfast` für den Plan existiert und User ein zweites erstellen will
- **THEN** wird ein 409 Conflict zurückgegeben

#### Scenario: Frühstücks-RefMeal entsteht erst beim Wizard-Abschluss
- **WHEN** der Nutzer den Frühstücks-Wizard öffnet, aber nicht abschließt
- **THEN** wird kein RefMeal für Frühstück erstellt

## ADDED Requirements

### Requirement: MealItem mit Zutat und Gramm-Menge
Das System SHALL MealItems auf RefMeals erlauben, eine Zutat (`ingredient_id`) mit einer expliziten Mengenangabe (Gramm oder ml) zu referenzieren — zusätzlich zur bestehenden Rezept-Referenz (`recipe_id`). Dies ermöglicht dem Frühstücks-Wizard, Basis, Belag, Gemüse und Getränke direkt als Zutaten zu speichern.

#### Scenario: Zutat mit Gramm-Menge speichern
- **WHEN** der Frühstücks-Wizard eine Belag-Zutat mit 30g speichert
- **THEN** wird ein MealItem mit `ingredient_id` und `quantity=30` (Gramm) erstellt

#### Scenario: Gemischte MealItems im selben RefMeal
- **WHEN** ein Frühstücks-RefMeal Brot/Belag als Zutaten und ein warmes Gericht als Rezept enthält
- **THEN** koexistieren MealItems mit `ingredient_id` und MealItems mit `recipe_id` im selben RefMeal
