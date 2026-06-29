# breakfast-wizard Specification (Delta)

## REMOVED Requirements

### Requirement: DrinkState mit mlPerPerson und Prozentwerten

**Reason**: Ersetzt durch `drinkRecipeIds`/`drinkFactors` — Getränke sind jetzt Rezepte wie warme Gerichte. Hartcodierte kcal-Konstanten sind konzeptionell falsch (kcal soll aus Zutaten kommen).

**Migration**: `DrinkState`-Felder (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson) entfallen aus WizardState und Zod-Schema. Bestehende gespeicherte RefMeals verlieren Getränkedaten beim nächsten Öffnen — Nutzer wählen Getränke im neu gestalteten StepGetraenke erneut aus.

### Requirement: StepGetraenke mit Prozent-Slidern je Getränkeart

**Reason**: Slider-basierte UI für Prozentwerte war konzeptionell falsch und nicht rezeptbasiert.

**Migration**: StepGetraenke wird vollständig auf Rezept-Auswahl umgebaut (analog StepExtras).

## MODIFIED Requirements

### Requirement: Wizard-Einstieg über RefMeal-Frühstück

Das System SHALL den Frühstücks-Wizard über zwei Routen öffnen:
1. `/meal-plans/:id/ref-meals/breakfast/wizard` — speichert als RefMeal und öffnet entweder einen leeren Wizard (kein RefMeal vorhanden) oder einen mit vorhandenen Daten vorausgefüllten Wizard (RefMeal existiert)
2. `/meal-plans/:id/meals/:mealId/breakfast-wizard` — speichert direkt in das angegebene Meal (DirectMeal-Mode), kein RefMeal-Bezug

#### Scenario: Kein RefMeal → Redirect zu Wizard

- **WHEN** der Nutzer `/meal-plans/:id/ref-meals/breakfast` aufruft und kein RefMeal mit `meal_type=breakfast` existiert
- **THEN** erfolgt ein automatischer Redirect zu `/meal-plans/:id/ref-meals/breakfast/wizard`
- **AND** der Wizard öffnet bei Schritt 1 (Basis) mit folgendem Standard: Bauernbrot = 100%, alle anderen Brotsorten = 0%

#### Scenario: Wizard für vorhandenes RefMeal vollständig vorausgefüllt öffnen

- **WHEN** ein RefMeal für Frühstück existiert (mit Basis, Belag und Getränke-Items) und der Nutzer "Frühstücksassistent" klickt
- **THEN** öffnet sich der Wizard mit aus den MealItems rekonstruierten Mengen und Verteilungen für Basis, Belag UND Getränke (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson)
- **AND** die Getränke-Slider in Schritt 4 zeigen die rekonstruierten Werte statt Default-Werte

#### Scenario: Abbrechen im Edit-Mode kehrt zur Vorschau zurück

- **WHEN** der Nutzer den Wizard für ein bestehendes RefMeal geöffnet hat und auf "Abbrechen" oder den ←-Pfeil klickt
- **THEN** navigiert das System zurück zu `/meal-plans/:id/ref-meals/breakfast`
- **AND** es werden keine Änderungen am RefMeal vorgenommen

#### Scenario: Wizard im DirectMeal-Mode startet immer mit leerem Zustand

- **WHEN** der Wizard über `/meal-plans/:id/meals/:mealId/breakfast-wizard` aufgerufen wird
- **THEN** startet der Wizard mit 100% Bauernbrot als Default (gleiches Verhalten wie RefMeal-Mode)
- **AND** der Progress-Bar und alle Steps sind identisch zum RefMeal-Mode

### Requirement: Schritt 1 — Basis mit Sortenverteilung

Das System SHALL im Schritt Basis die Gesamtmenge in BE pro Person erfassen und über Schieberegler auf die gewählten Basis-Sorten verteilen. Die Verteilungssumme MUSS 100% betragen. Aus Scheibengewicht (`standard_recipe_weight_g`) und Anteil SHALL das System Gramm- und kcal-Werte pro Sorte berechnen. Der Default beim erstmaligen Öffnen (keine gespeicherte Verteilung) MUSS Bauernbrot = 100%, alle anderen Brotsorten = 0% sein. Falls Bauernbrot nicht im Katalog existiert, SHALL das System das erste verfügbare Base-Ingredient auf 100% setzen.

#### Scenario: Basis-Verteilung berechnet Gramm

- **WHEN** 3 BE/Person mit 50% Bauernbrot (60g/Scheibe) und 50% Brötchen gewählt sind
- **THEN** zeigt das System 1,5 Bauernbrot-Scheiben (90g) und die entsprechende Brötchenmenge mit Gramm und kcal

#### Scenario: Verteilungssumme wird auf 100% gehalten

- **WHEN** der Nutzer einen Basis-Schieberegler verändert
- **THEN** passt das System die übrigen ungesperrten Sorten so an, dass die Summe 100% bleibt

#### Scenario: Default ist 100% Bauernbrot

- **WHEN** der Wizard zum ersten Mal geöffnet wird (keine gespeicherte Verteilung)
- **THEN** zeigt das System Bauernbrot = 100%, alle anderen Brotsorten = 0%
- **AND** alle Brotsorten sind sichtbar und ihre Slider sind aktiv

#### Scenario: Fallback bei fehlendem Bauernbrot

- **WHEN** der Katalog kein Bauernbrot enthält (gelöscht oder fehlende Seed-Daten)
- **THEN** setzt das System das erste verfügbare Base-Ingredient auf 100% und alle anderen auf 0%

#### Scenario: Gespeicherte Verteilung hat Vorrang

- **WHEN** ein vorhandenes RefMeal mit gespeicherter Brot-Verteilung geöffnet wird
- **THEN** zeigt das System die gespeicherte Verteilung (nicht den Default)

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
