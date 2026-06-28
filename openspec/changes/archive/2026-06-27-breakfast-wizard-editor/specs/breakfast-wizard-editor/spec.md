## ADDED Requirements

### Requirement: Breakfast Vorschau ohne Rezept-Baukasten
Das System SHALL auf der Route `/meal-plans/:id/ref-meals/breakfast` für Breakfast-RefMeals eine read-only Vorschau anzeigen. Der Rezept-Baukasten (Recipe Picker + Add/Remove/Factor-Edit) MUSS für Breakfast entfallen.

#### Scenario: Breakfast-Vorschau zeigt gruppierte Kategorien
- **WHEN** der Nutzer die Breakfast-Vorschau-Seite öffnet und ein RefMeal existiert
- **THEN** werden die Items gruppiert angezeigt in den Kategorien Brot, Belag, Warme Gerichte, Extras und Getränke
- **AND** es gibt keinen Rezept-Picker, keinen "Normalisieren"-Button und keinen "Speichern"-Button

#### Scenario: Kein RefMeal für Breakfast → Redirect zu Wizard
- **WHEN** kein RefMeal mit `meal_type=breakfast` existiert
- **THEN** erfolgt ein automatischer Redirect zu `/meal-plans/:id/ref-meals/breakfast/wizard`
- **AND** der Nutzer landet direkt im Wizard bei Schritt 1

### Requirement: Kategorie-Gruppierung über ingredient_tags und recipe_type
Das System SHALL MealItems anhand von `ingredient_tags` (NutritionalTags) und `recipe_type` in Kategorien gruppieren. Die Gruppierungs-Reihenfolge MUSS sein: Brot → Belag → Warme Gerichte → Extras → Getränke.

#### Scenario: Brot-Kategorie erkennt frühstücks-basis Tag
- **WHEN** ein MealItem `ingredient_tags` mit `"frühstücks-basis"` enthält
- **THEN** wird es in der Kategorie "Brot" angezeigt

#### Scenario: Belag-Kategorie erkennt frühstücks-belag Tag
- **WHEN** ein MealItem `ingredient_tags` mit `"frühstücks-belag"` enthält
- **THEN** wird es in der Kategorie "Belag" angezeigt

#### Scenario: Getränke-Kategorie erkennt recipe_type=drink
- **WHEN** ein MealItem `recipe_type === "drink"` hat
- **THEN** wird es in der Kategorie "Getränke" angezeigt

#### Scenario: Rezept-Items ohne drink-Typ landen in Warme Gerichte
- **WHEN** ein MealItem eine `recipe_id` hat und `recipe_type !== "drink"` ist
- **THEN** wird es in der Kategorie "Warme Gerichte" angezeigt

#### Scenario: Ingredient-Items ohne Tags landen in Extras
- **WHEN** ein MealItem eine `ingredient_id` hat, aber keine Tags aus `frühstücks-basis` oder `frühstücks-belag`
- **THEN** wird es in der Kategorie "Extras" angezeigt

### Requirement: Energie-Anzeige getrennt nach Essen und Getränke
Das System SHALL die Energie in der Breakfast-Vorschau zweigeteilt anzeigen: "Essen" (Brot + Belag + Warme Gerichte + Extras) und "Getränke" (alle recipe_type=drink Items). Ein Gesamt-Total MUSS entfallen.

#### Scenario: Energie getrennt anzeigen
- **WHEN** die Breakfast-Vorschau geladen ist mit Brot (320 kcal), Belag (180 kcal), Rührei (150 kcal) und Kaffee (20 kcal)
- **THEN** zeigt die Vorschau "Essen: 650 kcal" und "Getränke: 20 kcal" als zwei separate Zeilen

### Requirement: Wizard-Einstieg aus Vorschau
Das System SHALL in der Breakfast-Vorschau einen prominenten "Frühstücksassistent öffnen"-Button anzeigen, der zum Wizard navigiert.

#### Scenario: Wizard-Button in Vorschau
- **WHEN** der Nutzer in der Breakfast-Vorschau den "Frühstücksassistent öffnen"-Button klickt
- **THEN** navigiert das System zu `/meal-plans/:id/ref-meals/breakfast/wizard`
- **AND** der Wizard öffnet mit dem bestehenden RefMeal vorausgefüllt

### Requirement: Sync- und Link-Aktionen bleiben erhalten
Das System SHALL die Aktionen "Für alle übernehmen" (sync) und "Alle verknüpfen" (link all) auch in der Breakfast-Vorschau anzeigen. Die Logik entspricht der bestehenden RefMeal-Sync/Link-API.

#### Scenario: Sync-Button in Vorschau
- **WHEN** der Nutzer "Für alle übernehmen" in der Breakfast-Vorschau klickt
- **THEN** wird `POST /api/meal-plans/{planId}/ref-meals/{id}/sync` aufgerufen
- **AND** alle verknüpften Meals werden aktualisiert
