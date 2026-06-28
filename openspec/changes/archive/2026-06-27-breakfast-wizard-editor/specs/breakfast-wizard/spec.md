## MODIFIED Requirements

### Requirement: Wizard-Einstieg über RefMeal-Frühstück
Das System SHALL auf der Route `/meal-plans/:id/ref-meals/breakfast` ohne vorhandenes RefMeal direkt zum Frühstücks-Wizard unter `/meal-plans/:id/ref-meals/breakfast/wizard` weiterleiten. Existiert bereits ein RefMeal für Frühstück, SHALL ein "Frühstücksassistent"-Button den Wizard mit den vorhandenen Mengen und Verteilungen vollständig vorausgefüllt öffnen. Dazu MÜSSEN gespeicherte Getränke-Items (Kaffee, Kakao, Tee, Milch) aus den RefMeal-Items (als `recipe_id` mit `recipe_type="drink"`) in den Wizard-State zurückgeladen und die Schieberegler vorausgefüllt werden. Der Wizard SHALL einen Abbrechen-Button bieten, der ohne Speichern zur Vorschau zurückkehrt.

#### Scenario: Kein RefMeal → Redirect zu Wizard
- **WHEN** der Nutzer `/meal-plans/:id/ref-meals/breakfast` aufruft und kein RefMeal mit `meal_type=breakfast` existiert
- **THEN** erfolgt ein automatischer Redirect zu `/meal-plans/:id/ref-meals/breakfast/wizard`
- **AND** der Wizard öffnet bei Schritt 1 (Basis) mit leerem Standardzustand

#### Scenario: Wizard für vorhandenes RefMeal vollständig vorausgefüllt öffnen
- **WHEN** ein RefMeal für Frühstück existiert (mit Basis, Belag und Getränke-Items) und der Nutzer "Frühstücksassistent" klickt
- **THEN** öffnet sich der Wizard mit aus den MealItems rekonstruierten Mengen und Verteilungen für Basis, Belag UND Getränke (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson)
- **AND** die Getränke-Slider in Schritt 4 zeigen die rekonstruierten Werte statt Default-Werte

#### Scenario: Abbrechen im Edit-Mode kehrt zur Vorschau zurück
- **WHEN** der Nutzer den Wizard für ein bestehendes RefMeal geöffnet hat und auf "Abbrechen" oder den ←-Pfeil klickt
- **THEN** navigiert das System zurück zu `/meal-plans/:id/ref-meals/breakfast`
- **AND** es werden keine Änderungen am RefMeal vorgenommen

### Requirement: Abschluss-Cockpit und Speichern
Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer vollständigen Transparenz-Tabelle anzeigen. Die Tabelle MUSS alle vier Komponentengruppen enthalten: Basis, Belag, warme Gerichte/Extras und Getränke — jeweils mit Position, Menge pro Person, kcal pro Person und prozentualem Anteil am Gesamt. Die Energieberechnung MUSS kcal aus allen Komponentengruppen summieren (nicht nur Basis und Belag). Die Hochrechnung (× Personen × Tage) sowie die Reste-Tabelle für Belag-Packungen bleiben erhalten. Erst bei Bestätigung SHALL das RefMeal erstellt und die Zusammenstellung als MealItems gespeichert werden. Getränke werden dabei als `recipe_id`-basierte Items (mit `recipe_type="drink"`) gespeichert, nicht als `display_name`-Items. Der Abbrechen-Button im Wizard navigiert zurück zur Vorschau-Seite ohne zu speichern.

#### Scenario: Cockpit-Tabelle zeigt alle Komponentengruppen
- **WHEN** der Nutzer im Cockpit ist und Getränke (Kaffee, Kakao, Tee, Milch), warme Gerichte und Extras konfiguriert hat
- **THEN** zeigt die Transparenz-Tabelle Zeilen für Basis-Sorten, Belag-Sorten, warme Gerichte, Extras-Zutaten und Getränke mit ihren jeweiligen Mengen, kcal und Prozent-Anteilen

#### Scenario: Energieberechnung summiert alle Komponenten
- **WHEN** Basis 200 kcal, Belag 150 kcal und Getränke (Kakao+Milch) 80 kcal pro Person ergeben
- **THEN** zeigt das Cockpit 430 kcal als Gesamt-Ist und der Soll-Ist-Balken basiert auf 430 kcal

#### Scenario: RefMeal wird erst beim Abschluss erstellt
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt
- **THEN** wird ein RefMeal mit `meal_type=breakfast` erstellt und die Komponenten als MealItems (Zutaten mit Gramm/ml-Menge, warme Gerichte mit recipe_id + Faktor, Getränke mit recipe_id + ml-Menge) gespeichert

#### Scenario: Abbrechen kehrt zur Vorschau zurück
- **WHEN** der Nutzer den Wizard ohne Abschluss verlässt (← oder Abbrechen)
- **THEN** wird kein RefMeal erstellt und keine MealItems gespeichert
- **AND** das System navigiert zu `/meal-plans/:id/ref-meals/breakfast`
