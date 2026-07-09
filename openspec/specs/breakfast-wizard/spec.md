# breakfast-wizard Specification

## Purpose

Erweitert den Frühstücks-Wizard um ein neues Streich-Fett-Schritt und integriert Portionshinweise (z.B. "≈ 1,5 Scheiben") in Basis- und Belag-Schritte. Zusätzlich wird die Getränke-Behandlung von prozentualem State auf rezeptbasierte Auswahl umgestellt.
## Requirements
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

Das System SHALL im Schritt Basis die Gesamtmenge in BE pro Person erfassen und über Schieberegler auf die gewählten Basis-Sorten verteilen. Die Verteilungssumme MUSS 100% betragen. Aus Scheibengewicht (`standard_recipe_weight_g`) und Anteil SHALL das System Gramm- und kcal-Werte pro Sorte berechnen. Der Default beim erstmaligen Öffnen (keine gespeicherte Verteilung) MUSS Bauernbrot = 100%, alle anderen Brotsorten = 0% sein. Falls Bauernbrot nicht im Katalog existiert, SHALL das System das erste verfügbare Base-Ingredient auf 100% setzen. Zusätzlich zur Gramm-Menge SHALL das System — sofern eine benannte Portion (z.B. „Scheibe") für die Zutat vorhanden ist — einen abgeleiteten Portionshinweis gemäß der `portion-quantity-hint`-Konvention anzeigen (Gramm zuerst, Portion sekundär).

#### Scenario: Basis-Verteilung berechnet Gramm und Portionshinweis

- **WHEN** 3 BE/Person mit 50% Bauernbrot (60g/Scheibe) und 50% Brötchen gewählt sind
- **THEN** zeigt das System für Bauernbrot `"90g · ≈ 1,5 Scheiben"` und für Brötchen die entsprechende Gramm-Menge mit passendem Portionshinweis, jeweils inklusive kcal

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

### Requirement: Kcal-Verteilung Brot+Belag+Streichfett

Das System SHALL die verteilbaren Kalorien wie folgt aufteilen:
1. Brot-Kcal = gramsPerPerson × (energyKcal100g / 100) — fix aus gramsPerPerson
2. Streichfett-Kcal = fatCoverage × 8g × (energyKcal100g / 100)
3. Belag-Kcal = distributableKcal - breadKcal - fatKcal

#### Scenario: Brot-Kcal ist fix

- **GIVEN** gramsPerPerson = 150, Bauernbrot = 265 kcal/100g
- **WHEN** Streichfett-Kcal = 40, Belag-Kcal muss berechnet werden
- **THEN** SHALL breadKcal = 398 (150 × 2.65) sein, unabhängig von Streichfett-Kcal

#### Scenario: Belag bekommt Rest

- **GIVEN** distributableKcal = 500, breadKcal = 300, fatKcal = 40
- **WHEN** Belag-Kcal berechnet wird
- **THEN** SHALL toppingKcal = 500 - 300 - 40 = 160 sein

### Requirement: Wizard hat 6 Schritte

Das System SHALL den Frühstücks-Wizard mit 6 statt 5 Schritten darstellen: Basis → Streichfett → Belag → Extras → Getränke → Cockpit.

#### Scenario: Schritt-Reihenfolge

- **WHEN** der Wizard geladen wird
- **THEN** SHALL die Schritt-Reihenfolge sein: `basis, fett, belag, extras, getraenke, cockpit`
- **AND** SHALL die deutsche Bezeichnung für Schritt 2 "Streichfett" sein

### Requirement: WizardState um fatSelections erweitert

Das System SHALL `fatSelections: FatSelection[]` als Teil des `WizardState` definieren. Eine `FatSelection` SHALL `ingredientId`, `name`, `sharePercent`, `locked`, `energyKcal100g`, `pricePerKg` und `portions` enthalten. "Kein Fett" wird als virtuelle Selection mit `ingredientId: 0` modelliert.

#### Scenario: Default fatSelections

- **WHEN** `defaultWizardState()` aufgerufen wird
- **THEN** SHALL `fatSelections = []` sein (wird beim Laden des Katalogs initialisiert)

#### Scenario: fatSelections werden im Katalog initialisiert

- **WHEN** der Katalog `fat_ingredients` enthält
- **THEN** SHALL `fatSelections` aus den Katalog-Zutaten + "Kein Fett" initialisiert werden
- **AND** SHALL die Default-Verteilung 50%/50% auf erstes Fat-Ingredient (Margarine) und "Kein Fett" sein

### Requirement: useWizardState um fat-Actions erweitert

Das System SHALL im WizardState-Hook die Actions `setFatShare`, `setFatLocked` und `initFats` bereitstellen — analog zu `setToppingShare`/`setBasisShare`.

#### Scenario: fat-Actions funktionieren

- **WHEN** `setFatShare(index, value)` aufgerufen wird
- **THEN** SHALL `rebalanceShares` auf `fatSelections` angewendet werden (wie bei Basis/Belag)
- **AND** SHALL die Summe 100% bleiben

### Requirement: Kcal-Fluss berücksichtigt Streichfett

Die Funktion `computeGroupKcal` SHALL um Streichfett-Kcal erweitert werden. Das Brot-Budget wird fix aus `gramsPerPerson × kcalDensity` berechnet, Streichfett-Kcal aus der Coverage, und der Rest geht an Belag.

#### Scenario: computeGroupKcal mit Streichfett

- **WHEN** `computeGroupKcal(basis, toppings, fats, dayPartFactor, fixKcal)` aufgerufen wird
- **THEN** SHALL der Rückgabewert `{ breadKcal, fatKcal, toppingKcal }` enthalten
- **AND** SHALL `fatKcal` aus den fatSelections berechnet werden
- **AND** SHALL `toppingKcal` = `distributableKcal - breadKcal - fatKcal` sein

### Requirement: refMealToWizardState erkennt breakfast-fat

Die Funktion `refMealItemsToWizardState` SHALL Items mit `breakfast-fat`-Tag in `fatSelections` umwandeln — und NICHT mehr in `toppings`. Items mit `breakfast-topping`-Tag und `breakfast-fat`-Tag (Migration) SHALL nur in `fatSelections` landen.

#### Scenario: Butter aus RefMeal wird als Streichfett geladen

- **GIVEN** ein gespeichertes RefMeal mit einem Butter-MealItem (tag: breakfast-fat)
- **WHEN** `refMealItemsToWizardState` ausgeführt wird
- **THEN** SHALL Butter in `fatSelections` erscheinen, nicht in `toppings`

#### Scenario: Migration — Item hat beide Tags

- **GIVEN** ein MealItem mit den Tags `["breakfast-topping", "breakfast-fat"]`
- **WHEN** `refMealItemsToWizardState` ausgeführt wird
- **THEN** SHALL das Item in `fatSelections` landen (Tag `breakfast-fat` hat Vorrang)

### Requirement: Cockpit zeigt Streichfett-Sektion

Das StepCockpit SHALL eine Sektion "Streichfett" zwischen Brot und Belag anzeigen, mit Gramm/Person, kcal/Person, Kosten/Person und prozentualem Anteil.

#### Scenario: Streichfett-Zeilen im Cockpit

- **WHEN** Streichfette aktiv sind (sharePercent > 0, ingredientId ≠ 0)
- **THEN** SHALL das Cockpit pro aktivem Streichfett eine Zeile anzeigen
- **AND** SHALL eine Gesamt-Zeile "Streichfett gesamt" mit summierten Gramm, kcal und Kosten erscheinen

### Requirement: buildItems inkludiert Streichfette

Die `buildItems`-Funktion in `BreakfastWizardPage` SHALL Streichfette als MealItems in den zu speichernden Item-List aufnehmen.

#### Scenario: Streichfette werden gespeichert

- **WHEN** `buildItems()` für State mit aktiven Streichfetten aufgerufen wird
- **THEN** SHALL jedes aktive Streichfett als `{ ingredient_id, quantity: gramsPerPerson, measuring_unit_id: gramUnitId, factor: 1.0 }` erscheinen

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

### Requirement: Portionshinweis im Belag-Schritt

Das System SHALL im Schritt Belag (`StepBelag.tsx`) für jede Belag-Zutat mit vorhandener benannter Portion (z.B. „Packung") zusätzlich zur Gramm-Menge im Slider-Detail einen abgeleiteten Portionshinweis gemäß der `portion-quantity-hint`-Konvention anzeigen.

#### Scenario: Belag mit Packungshinweis

- **WHEN** eine Belag-Zutat mit berechneten 40g angezeigt wird und ihre Portion „Packung" `weight_g=500` besitzt
- **THEN** MUST der Slider-Detail-Text `"40g · ≈ 0,1 Packung"` enthalten

### Requirement: Portionshinweis in der Cockpit-Zusammenfassung

Das System SHALL in der Zusammenfassungstabelle des Cockpit-Schritts (`StepCockpit.tsx`) für jede Position mit Gramm-Menge und vorhandener benannter Portion zusätzlich den abgeleiteten Portionshinweis anzeigen, sowohl je Zeile als auch in den Gesamtsummen-Zeilen (z.B. „Brote gesamt", „Belag gesamt").

#### Scenario: Zusammenfassungszeile mit Portionshinweis

- **WHEN** die Zusammenfassungstabelle eine Brot-Position mit 90g und Portion „Scheibe" (`weight_g=60`) zeigt
- **THEN** MUST die „Menge/P"-Spalte `"90g · ≈ 1,5 Scheiben"` enthalten

#### Scenario: Gesamtsummen-Zeile mit gemischten Zutaten

- **WHEN** die „Brote gesamt"-Zeile aus mehreren Brotsorten mit unterschiedlichen Portionsgrößen berechnet wird
- **THEN** MUST die Gesamtsummen-Zeile nur die Gramm-Gesamtsumme zeigen, ohne einen (nicht sinnvoll aggregierbaren) Portionshinweis für die Summenzeile

