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

### Requirement: Energie, Kosten und Nährwerte für Zutaten-MealItems
Das System SHALL Energie, Kosten und Nährwerte eines Meals aus ALLEN MealItems berechnen — sowohl aus Rezept-Items (`recipe`) als auch aus Zutaten-Items (`ingredient` + `quantity` + `measuring_unit`). Für Zutaten-Items SHALL die Energie aus `Ingredient.energy_kcal × (Menge_in_g / 100) × factor`, die Kosten aus `price_per_kg × (Menge_in_g / 1000) × factor` und die Nährwerte analog aus den jeweiligen `Ingredient`-Feldern berechnet werden. Mengen in ml MÜSSEN über `physical_density` zu Gramm konvertiert werden.

#### Scenario: Zutaten-Item trägt Energie bei
- **WHEN** ein Meal ein Zutaten-Item mit 30g Gouda (Gouda hat 356 kcal/100g) und `factor=1.0` enthält
- **THEN** trägt dieses Item ca. 107 kcal zur Gesamtenergie des Meals bei

#### Scenario: Zutaten-Item trägt Kosten bei
- **WHEN** ein Meal ein Zutaten-Item mit 30g einer Zutat mit `price_per_kg=8.00€` enthält
- **THEN** trägt dieses Item 0,24 € zu den Gesamtkosten bei

#### Scenario: Gemischtes Meal aus Rezept und Zutaten
- **WHEN** ein Meal sowohl Rezept-Items als auch Zutaten-Items enthält
- **THEN** summiert die Berechnung beide Quellen zur Gesamtenergie und zu den Gesamtkosten

### Requirement: Nährwert-Aggregation robust gegen Zutaten-Items
Das System SHALL bei der Nährwert-Aggregation keine Annahme treffen, dass jedes MealItem ein Rezept hat. Zugriffe auf Rezept-Felder (z.B. `cached_nutri_class`) MÜSSEN gegen `recipe=None` abgesichert sein, sodass Meals mit Zutaten-Items nicht zu einem Fehler führen.

#### Scenario: Aggregation mit reinem Zutaten-Meal
- **WHEN** ein Meal ausschließlich Zutaten-Items (kein Rezept) enthält und die Nährwert-Aggregation aufgerufen wird
- **THEN** wird die Aggregation ohne Fehler berechnet
