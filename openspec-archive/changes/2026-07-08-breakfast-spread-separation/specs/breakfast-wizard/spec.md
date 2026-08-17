# breakfast-wizard Specification (Delta)

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Schritt 1 — Basis mit Sortenverteilung

Das System SHALL im Schritt Basis die Gesamtmenge in Gramm pro Person erfassen (gramsPerPerson, Range 50-300g, Default 150g) und über Schieberegler auf die gewählten Basis-Sorten verteilen. Die Verteilungssumme MUSS 100% betragen. Aus Scheibengewicht (`standard_recipe_weight_g`) und Anteil SHALL das System Gramm- und kcal-Werte pro Sorte berechnen.

Die Brot-Kcal SHALL fix aus `gramsPerPerson × kcalDensity` berechnet werden und NICHT mehr proportional aus dem distributableKcal-Budget — das Budget für Belag reduziert sich entsprechend um Brot-Kcal.

#### Scenario: Basis-Verteilung berechnet Gramm

- **WHEN** 150g/Person mit 50% Bauernbrot (265 kcal/100g) gewählt sind
- **THEN** zeigt das System 75g Bauernbrot (199 kcal)
- **AND** SHALL breadKcal = 199 fix sein (nicht mehr vom distributableKcal abhängig)

#### Scenario: Verteilungssumme wird auf 100% gehalten

- **WHEN** der Nutzer einen Basis-Schieberegler verändert
- **THEN** passt das System die übrigen ungesperrten Sorten so an, dass die Summe 100% bleibt

#### Scenario: Default ist 100% Bauernbrot

- **WHEN** der Wizard zum ersten Mal geöffnet wird (keine gespeicherte Verteilung)
- **THEN** zeigt das System Bauernbrot = 100%, alle anderen Brotsorten = 0%
- **AND** alle Brotsorten sind sichtbar und ihre Slider sind aktiv

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
