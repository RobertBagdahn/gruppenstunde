## MODIFIED Requirements

### Requirement: Abschluss-Cockpit und Speichern
Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer vollständigen Transparenz-Tabelle anzeigen. Die Tabelle MUSS alle vier Komponentengruppen enthalten: Basis, Belag, warme Gerichte/Extras und Getränke — jeweils mit Position, Menge pro Person, kcal pro Person und prozentualem Anteil am Gesamt. Die Energieberechnung MUSS kcal aus allen Komponentengruppen summieren (nicht nur Basis und Belag). Die Hochrechnung (× Personen × Tage) sowie die Reste-Tabelle für Belag-Packungen bleiben erhalten. Erst bei Bestätigung SHALL das RefMeal erstellt und die Zusammenstellung als MealItems gespeichert werden.

#### Scenario: Cockpit-Tabelle zeigt alle Komponentengruppen
- **WHEN** der Nutzer im Cockpit ist und Getränke (Kaffee, Kakao, Tee, Milch), warme Gerichte und Extras konfiguriert hat
- **THEN** zeigt die Transparenz-Tabelle Zeilen für Basis-Sorten, Belag-Sorten, warme Gerichte, Extras-Zutaten und Getränke mit ihren jeweiligen Mengen, kcal und Prozent-Anteilen

#### Scenario: Energieberechnung summiert alle Komponenten
- **WHEN** Basis 200 kcal, Belag 150 kcal und Getränke (Kakao+Milch) 80 kcal pro Person ergeben
- **THEN** zeigt das Cockpit 430 kcal als Gesamt-Ist und der Soll-Ist-Balken basiert auf 430 kcal

#### Scenario: RefMeal wird erst beim Abschluss erstellt
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt
- **THEN** wird ein RefMeal mit `meal_type=breakfast` erstellt und die Komponenten als MealItems (Zutaten mit Gramm/ml-Menge, warme Gerichte mit recipe_id + Faktor, Getränke mit display_name + ml-Menge) gespeichert

#### Scenario: Abbrechen hinterlässt keine Daten
- **WHEN** der Nutzer den Wizard ohne Abschluss verlässt
- **THEN** wird kein RefMeal und werden keine MealItems erstellt

### Requirement: Wizard-Einstieg über RefMeal-Frühstück
Das System SHALL auf der Route `/meal-plans/:id/ref-meals/breakfast` den Frühstücks-Wizard öffnen, wenn der Nutzer "Referenz-Mahlzeit erstellen" wählt. Existiert bereits ein RefMeal für Frühstück, SHALL ein "Frühstücksassistent"-Button den Wizard mit den vorhandenen Mengen und Verteilungen vollständig vorausgefüllt öffnen. Dazu MÜSSEN gespeicherte Getränke-Items (Kaffee, Kakao, Tee, Milch) aus den RefMeal-Items in den Wizard-State zurückgeladen werden — nicht nur der `day_part_factor`.

#### Scenario: Wizard ohne vorhandenes RefMeal öffnen
- **WHEN** kein RefMeal für `meal_type=breakfast` existiert und der Nutzer "Referenz-Mahlzeit erstellen" klickt
- **THEN** öffnet sich der Frühstücks-Wizard bei Schritt 1 (Basis) mit leerem Zustand
- **AND** es wird noch kein RefMeal in der Datenbank erstellt

#### Scenario: Wizard für vorhandenes RefMeal vollständig vorausgefüllt öffnen
- **WHEN** ein RefMeal für Frühstück existiert (mit Basis, Belag und Getränke-Items) und der Nutzer "Frühstücksassistent" klickt
- **THEN** öffnet sich der Wizard mit aus den MealItems rekonstruierten Mengen und Verteilungen für Basis, Belag UND Getränke (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson)
- **AND** die Getränke-Slider in Schritt 4 zeigen die rekonstruierten Werte statt Default-Werte

### Requirement: Normalisieren skaliert Basis, Belag und Getränke
Das System SHALL beim Normalisieren auf das Soll Basis-BE, Belag-Portionen und Getränke-Mengen mit dem Faktor `Soll/Ist` multiplizieren, wobei Soll und Ist nun kcal aus ALLEN Komponentengruppen einschließlich Getränken umfassen. Gemüse/Extras und warme Rezepte MÜSSEN dabei unverändert bleiben. Die Belag-Deckung MUSS erhalten bleiben.

#### Scenario: Normalisieren berücksichtigt Getränke im Ist
- **WHEN** Ist 480 kcal (Basis+Belag) und Getränke 80 kcal ergeben, Soll 700 kcal beträgt (Faktor 1,25)
- **THEN** werden Basis-BE, Belag-Portionen und Getränke-Mengen (mlPerPerson) mit Faktor 1,25 skaliert
- **AND** Gemüse und Extras bleiben unverändert

#### Scenario: Normalisieren erhält Belag-Deckung
- **WHEN** Ist 480 kcal und Soll 600 kcal beträgt (Faktor 1,25)
- **THEN** werden Basis-BE und Belag-Portionen gleich skaliert, sodass die Deckung 100% bleibt
- **AND** Gemüse und Extras bleiben unverändert
