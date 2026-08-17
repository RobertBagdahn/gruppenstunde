## ADDED Requirements

### Requirement: Getränke als Rezepte mit recipe_type="drink"
Das System SHALL Getränke (Kaffee, Kakao, Tee, Milch) als Rezepte mit `recipe_type="drink"` in der Datenbank führen. Jedes Getränkerezept MUSS `portions=1` und einen `cached_energy_total_kcal` korrespondierend zu den enthaltenen Nährwerten haben.

#### Scenario: Getränkerezept hat recipe_type=drink
- **WHEN** ein Getränkerezept (z.B. "Kaffee fully loaded") in der Datenbank angelegt wird
- **THEN** hat es `recipe_type="drink"` und `portions=1`

### Requirement: GET /api/supply/breakfast-catalog/drinks/ Endpoint
Das System SHALL einen neuen API-Endpoint `GET /api/supply/breakfast-catalog/drinks/` bereitstellen, der alle Rezepte mit `recipe_type="drink"` als Liste zurückgibt.

#### Scenario: Drinks-Endpoint gibt Getränkerezepte zurück
- **WHEN** `GET /api/supply/breakfast-catalog/drinks/` aufgerufen wird
- **THEN** returned der Endpoint ein JSON-Array mit `{ id, title, recipe_type, cached_energy_kcal }` für jedes Getränkerezept

### Requirement: Wizard speichert Getränke als recipe_id
Der Breakfast Wizard MUSS Getränke aus dem Slider (Schritt 4) als `recipe_id`-basierte MealItems speichern, nicht als `display_name`-Items. Der Drink-Name aus dem Slider wird gegen den Drink-Catalog gematched, um die passende `recipe_id` zu ermitteln.

#### Scenario: Wizard-Save verwendet recipe_id für Kaffee
- **WHEN** der Nutzer den Wizard speichert und Kaffee mit coffeePercent > 0 konfiguriert hat
- **THEN** wird ein MealItem mit `recipe_id` (passend zu "Kaffee") und `quantity` (ml) gespeichert
- **AND** es wird kein `display_name`-Item gespeichert

### Requirement: Wizard-Load mappt Getränke-Items zurück
Der Breakfast Wizard MUSS beim Laden eines bestehenden RefMeals Getränke-Items (mit `recipe_type="drink"`) in den Wizard-State Schritt 4 (Getränke) zurückmappen. Dazu werden die ml-Verhältnisse der Items in coffeePercent/cocoaPercent/teaPercent umgerechnet.

#### Scenario: Ggeladene Getränke-Items befüllen Schieberegler
- **WHEN** ein RefMeal mit items `[{recipe_id: 42, quantity: 150, recipe_type: "drink"}, {recipe_id: 45, quantity: 50, recipe_type: "drink"}]` geladen wird
- **THEN** wird `drinks.mlPerPerson = 200` und `coffeePercent` entsprechend gesetzt
- **AND** die Getränke-Schieberegler in Schritt 4 zeigen die rekonstruierten Werte
