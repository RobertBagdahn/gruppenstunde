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
