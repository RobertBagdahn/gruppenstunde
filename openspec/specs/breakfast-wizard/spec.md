# breakfast-wizard Specification (Delta)

## REMOVED Requirements

### Requirement: DrinkState mit mlPerPerson und Prozentwerten

**Reason**: Ersetzt durch `drinkRecipeIds`/`drinkFactors` — Getränke sind jetzt Rezepte wie warme Gerichte. Hartcodierte kcal-Konstanten sind konzeptionell falsch (kcal soll aus Zutaten kommen).

**Migration**: `DrinkState`-Felder (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson) entfallen aus WizardState und Zod-Schema. Bestehende gespeicherte RefMeals verlieren Getränkedaten beim nächsten Öffnen — Nutzer wählen Getränke im neu gestalteten StepGetraenke erneut aus.

### Requirement: StepGetraenke mit Prozent-Slidern je Getränkeart

**Reason**: Slider-basierte UI für Prozentwerte war konzeptionell falsch und nicht rezeptbasiert.

**Migration**: StepGetraenke wird vollständig auf Rezept-Auswahl umgebaut (analog StepExtras).

## ADDED Requirements

### Requirement: drinkRecipeIds und drinkFactors im WizardState

Das System SHALL `drinkRecipeIds: number[]` und `drinkFactors: Record<number, number>` als Teil des `WizardState` definieren — analog zu `warmDishRecipeIds` und `warmDishFactors`.

#### Scenario: Leerer Anfangszustand

- **GIVEN** ein neuer Wizard wird geöffnet
- **THEN** SHALL `drinkRecipeIds = []` und `drinkFactors = {}` sein

#### Scenario: Getränke aus RefMeal laden

- **GIVEN** ein bestehendes RefMeal mit gespeicherten Getränke-MealItems
- **WHEN** der Wizard das RefMeal lädt (`refMealToWizardState`)
- **THEN** SHALL Getränke-Rezepte aus den MealItems in `drinkRecipeIds` aufgenommen werden

### Requirement: Getränke-kcal in Cockpit aus Rezept-Daten

Das System SHALL die kcal-Berechnung für Getränke im StepCockpit aus `recipe.cached_energy_kcal` ableiten — nicht aus `KCAL_PER_100ML_*`-Konstanten. Die Berechnung ist analog zu warmen Gerichten.

#### Scenario: Cockpit summiert Getränke-kcal aus Rezept-Cache

- **GIVEN** ein Getränke-Rezept mit bekanntem `cached_energy_kcal`
- **WHEN** StepCockpit `totalKcalPerPerson` berechnet
- **THEN** SHALL der Getränke-Anteil aus dem Rezept-Cache stammen

#### Scenario: Getränke ohne ausgewählte Rezepte → 0 kcal

- **GIVEN** `drinkRecipeIds` ist leer
- **WHEN** Cockpit berechnet
- **THEN** SHALL Getränke 0 kcal beitragen

### Requirement: StepGetraenke zeigt Getränke-Rezepte zur Auswahl

Das System SHALL im `StepGetraenke` Rezepte mit `breakfast-drink`-Tag aus dem Katalog-Endpoint anzeigen und per Toggle zu `drinkRecipeIds` hinzufügen oder entfernen.

#### Scenario: Auswahl-Toggle

- **GIVEN** ein Getränk-Rezept ist sichtbar im Katalog
- **WHEN** Nutzer auf das Rezept klickt
- **THEN** SHALL `drinkRecipeIds` togglen (add/remove) und `drinkFactors[id]` auf 1.0 setzen beim Hinzufügen

#### Scenario: Bereits ausgewählte Getränke werden hervorgehoben

- **GIVEN** `drinkRecipeIds = [42]`
- **WHEN** StepGetraenke rendert
- **THEN** SHALL Rezept 42 als ausgewählt markiert dargestellt werden
