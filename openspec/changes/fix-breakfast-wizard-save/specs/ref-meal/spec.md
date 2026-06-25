## MODIFIED Requirements

### Requirement: RefMeal erstellen
Das System SHALL erlauben, pro MealPlan und meal_type maximal ein RefMeal (Meal mit `is_reference=True`) zu erstellen. Ein RefMeal hat keinen konkreten Zeitpunkt (`start_datetime=NULL`). Das Erstellen MUSS optional `items` akzeptieren, die direkt als MealItems des neuen RefMeals angelegt werden. Für `meal_type=breakfast` SHALL das RefMeal erst beim Abschluss des Frühstücks-Wizards erstellt werden, nicht beim Öffnen.

#### Scenario: RefMeal für Frühstück erstellen
- **WHEN** User ein RefMeal mit `meal_type=breakfast` für einen MealPlan erstellt
- **THEN** wird ein Meal mit `is_reference=True`, `start_datetime=NULL` und dem angegebenen `meal_type` erstellt

#### Scenario: RefMeal mit Items erstellen
- **WHEN** User ein RefMeal mit `meal_type=breakfast` und einer Liste von `items` erstellt
- **THEN** wird das RefMeal erstellt und alle Items als MealItems mit den angegebenen `recipe_id`, `ingredient_id`, `quantity`, `measuring_unit_id`, `display_name` und `factor` gespeichert

#### Scenario: Duplikat verhindern
- **WHEN** bereits ein RefMeal mit `meal_type=breakfast` für den Plan existiert und User ein zweites erstellen will
- **THEN** wird ein 409 Conflict zurückgegeben

#### Scenario: Frühstücks-RefMeal entsteht erst beim Wizard-Abschluss
- **WHEN** der Nutzer den Frühstücks-Wizard öffnet, aber nicht abschließt
- **THEN** wird kein RefMeal für Frühstück erstellt
