# breakfast-drink-recipes Specification

## Purpose

Getränke im Breakfast Wizard werden von hartkodierten kcal-Konstanten und `DrinkState`-Feldern auf ein Rezept-basiertes System umgestellt — analog zu warmen Gerichten (`warmDishRecipeIds`/`warmDishFactors`). kcal kommt aus Rezept-Cachedaten. Getränk-Rezepte werden als MealItems im Frühstücksmeal gespeichert.

## Requirements

### Requirement: DrinkState wird durch drinkRecipeIds und drinkFactors ersetzt

Das System SHALL `DrinkState` (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson) aus dem `WizardState`-Schema entfernen und durch `drinkRecipeIds: number[]` und `drinkFactors: Record<number, number>` ersetzen.

#### Scenario: Getränk wird zum Wizard-State hinzugefügt

- **GIVEN** ein Nutzer wählt im StepGetraenke ein Kaffee-Rezept (id=42) aus
- **WHEN** das Rezept ausgewählt wird
- **THEN** SHALL `drinkRecipeIds` das Rezept enthalten: `[42]`
- **AND** SHALL `drinkFactors[42]` den Standard-factor (z.B. `1.0`) enthalten

#### Scenario: WizardState ohne Getränke

- **GIVEN** ein Nutzer hat keine Getränke ausgewählt
- **THEN** SHALL `drinkRecipeIds = []` und `drinkFactors = {}` sein

### Requirement: Getränke-Kalorien werden aus Rezept-Cachedaten berechnet

Das System SHALL die Kalorienberechnung für Getränke im Cockpit-Step aus `recipe.cached_energy_kcal` (pro 100g) und `recipe.portions` ableiten — analog zur Berechnung für warme Gerichte.

#### Scenario: Cockpit zeigt Getränke-kcal aus Rezept

- **GIVEN** ein Getränke-Rezept mit `cached_energy_kcal=42` kcal/100g und `portions=1`
- **AND** `factor=1.0`, `effective_portions=10`
- **WHEN** StepCockpit die Gesamt-kcal berechnet
- **THEN** SHALL der Getränke-Beitrag aus dem Rezept-Cache stammen, nicht aus `KCAL_PER_100ML_*`-Konstanten

#### Scenario: Keine Getränke → 0 kcal Beitrag

- **GIVEN** `drinkRecipeIds = []`
- **WHEN** Cockpit-Berechnung läuft
- **THEN** SHALL der Getränke-kcal-Beitrag 0 sein

### Requirement: Hartcodierte kcal-Konstanten werden entfernt

Das System SHALL die Konstanten `KCAL_PER_100ML_COFFEE`, `KCAL_PER_100ML_COCOA`, `KCAL_PER_100ML_TEA`, `KCAL_PER_100ML_MILK` sowie die Funktionen `drinksKcalPerPerson` und `totalMilkMlPerPerson` aus `breakfastCalc.ts` entfernen.

#### Scenario: Kein Import der alten Konstanten möglich

- **GIVEN** das refactorte `breakfastCalc.ts`
- **WHEN** Code versucht `KCAL_PER_100ML_COCOA` zu importieren
- **THEN** SHALL ein TypeScript-Compilerfehler entstehen (Export existiert nicht mehr)

### Requirement: StepGetraenke zeigt Rezept-Auswahl statt Prozent-Slider

Das System SHALL `StepGetraenke` auf eine Rezept-Auswahl umbauen — analog zu `StepExtras` für warme Gerichte. Nutzer wählen Getränke-Rezepte aus dem `breakfast-drink`-Katalog aus und konfigurieren optional einen factor.

#### Scenario: Getränke-Katalog wird angezeigt

- **GIVEN** Nutzer öffnet StepGetraenke
- **WHEN** der Step gerendert wird
- **THEN** SHALL Rezepte mit `breakfast-drink`-Tag aus dem Katalog-Endpoint angezeigt werden

#### Scenario: Getränk hinzufügen

- **GIVEN** Nutzer klickt auf ein Getränk-Rezept
- **WHEN** das Rezept ausgewählt wird
- **THEN** SHALL es zu `drinkRecipeIds` hinzugefügt werden mit `drinkFactors[id] = 1.0`

#### Scenario: Getränk entfernen

- **GIVEN** ein Getränk ist bereits ausgewählt
- **WHEN** Nutzer klickt erneut darauf (toggle)
- **THEN** SHALL es aus `drinkRecipeIds` und `drinkFactors` entfernt werden

### Requirement: Getränke werden als MealItems beim Wizard-Save gespeichert

Das System SHALL beim Speichern des Wizard-States Getränke-Rezepte als MealItems (recipe) im Frühstücksmeal anlegen — identisch zur Behandlung von warmen Gerichten aus `warmDishRecipeIds`.

#### Scenario: Getränke-MealItems werden beim Save erstellt

- **GIVEN** `drinkRecipeIds = [42, 55]` mit `drinkFactors = {42: 1.0, 55: 0.5}`
- **WHEN** der Wizard gespeichert wird (`POST /api/meal-plans/{id}/meals/{meal_id}/wizard-items/`)
- **THEN** SHALL zwei MealItems mit `recipe_id=42` (factor=1.0) und `recipe_id=55` (factor=0.5) angelegt werden

#### Scenario: Getränke erscheinen in nutrition_summary und cost_summary

- **GIVEN** Getränke sind als MealItems gespeichert
- **WHEN** `nutrition_summary` oder `cost_summary` aufgerufen wird
- **THEN** SHALL Getränke-Nährwerte und -Kosten in die Aggregation einfließen (kein separater Pfad nötig)
