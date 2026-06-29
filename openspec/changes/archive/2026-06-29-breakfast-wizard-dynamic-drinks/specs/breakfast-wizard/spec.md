## MODIFIED Requirements

### Requirement: Schritt 4 — Dynamische Getränke aus Rezepten

**Vollständig ersetzt**: Statt drei hartcodierten Kaffee/Kakao/Tee-Sliddern mit Milch-Eingabe eine dynamische Liste von Drink-Rezepten mit Prozent-Sliddern.

Das System SHALL im Schritt Getränke eine dynamische Liste von ausgewählten Drink-Rezepten anzeigen. Jeder Drink hat einen Prozent-Slider (0-100%, Summe 100%) und einen Namen. Der Nutzer KANN neue Drinks über den RecipeSearchDialog hinzufügen und bestehende entfernen. Milch wird in Schritt 4 NICHT mehr erfasst.

#### Scenario: Drink hinzufügen
- **WHEN** der Nutzer auf "[+ Getränk]" klickt und im RecipeSearchDialog "Pfefferminztee" auswählt
- **THEN** wird "Pfefferminztee" mit einem Standard-Prozentwert zur Drink-Liste hinzugefügt
- **AND** alle Prozentwerte werden neu verteilt (Summe = 100%)

#### Scenario: Drink entfernen
- **WHEN** der Nutzer auf "✕" neben "Pfefferminztee" klickt
- **THEN** wird der Drink aus der Liste entfernt
- **AND** die Prozentwerte der verbleibenden Drinks werden neu verteilt (Summe = 100%)

#### Scenario: Prozent-Slider rebalanced
- **WHEN** drei Drinks bei 40/30/30 stehen und der Nutzer den ersten auf 60% schiebt
- **THEN** werden die beiden anderen proportional auf 20/20 reduziert
- **AND** die Summe bleibt 100%

#### Scenario: Alle Drinks entfernt
- **WHEN** der Nutzer den letzten Drink aus der Liste entfernt
- **THEN** wird die Drink-Liste als leer angezeigt
- **AND** die Gesamtmenge (ml/Person) bleibt erhalten

### Requirement: Wizard-Zustand für dynamische Drinks

**Vollständig ersetzt**: Statt fixer coffee/cocoa/tea-Felder ein dynamisches Array.

Das System SHALL den Getränke-Zustand im Wizard als dynamisches Array von Drink-Selektionen speichern. Jede Selektion enthält recipeId, recipeTitle und sharePercent. Die Gesamtmenge mlPerPerson bleibt erhalten. Milch-Felder entfallen.

#### Scenario: Wizard-Zustand nach Drink-Auswahl
- **WHEN** der Nutzer "Filterkaffee" und "Pfefferminztee" mit 60% und 40% und 300ml Gesamtmenge konfiguriert hat
- **THEN** enthält der Wizard-State `{ mlPerPerson: 300, selected: [{ recipeId: 1, title: "Filterkaffee", sharePercent: 60 }, { recipeId: 5, title: "Pfefferminztee", sharePercent: 40 }] }`

### Requirement: Schritt 5 — Abschluss-Cockpit ohne Getränke

**Vollständig ersetzt**: Getränke werden im Cockpit weder angezeigt noch in die Energieberechnung einbezogen.

Das System SHALL vor dem Speichern ein Cockpit mit Doppelchecks und einer Transparenz-Tabelle anzeigen. Die Tabelle MUSS die Komponentengruppen Basis, Belag und warme Gerichte/Extras enthalten — Getränke werden NICHT angezeigt. Die Energieberechnung MUSS kcal aus Basis, Belag und warmen Gerichten/Extras summieren (ohne Getränke). Die Hochrechnung (× Personen × Tage) sowie die Reste-Tabelle für Belag-Packungen bleiben erhalten.

#### Scenario: Cockpit ohne Getränke
- **WHEN** Basis 200 kcal, Belag 150 kcal und Getränke 80 kcal pro Person ergeben
- **THEN** zeigt das Cockpit 350 kcal als Gesamt-Ist
- **AND** Getränke werden in der Tabelle nicht aufgeführt
- **AND** der Soll-Ist-Balken basiert auf 350 kcal

### Requirement: Normalisieren skaliert Basis und Belag (ohne Getränke)

**Vollständig ersetzt**: Getränke werden beim Normalisieren nicht skaliert.

Das System SHALL beim Normalisieren auf das Soll Basis-BE und Belag-Portionen mit dem Faktor `Soll/Ist` multiplizieren, wobei Soll und Ist kcal aus Basis, Belag und warmen Gerichten/Extras umfassen (ohne Getränke). Gemüse/Extras und warme Rezepte MÜSSEN unverändert bleiben. Die Belag-Deckung MUSS erhalten bleiben. Getränke werden beim Normalisieren ignoriert.

#### Scenario: Normalisieren ignoriert Getränke
- **WHEN** Ist 480 kcal (Basis+Belag) und Getränke 80 kcal ergeben, Soll 600 kcal beträgt (Faktor 1,25)
- **THEN** werden Basis-BE und Belag-Portionen mit Faktor 1,25 skaliert
- **AND** Getränke-Mengen bleiben unverändert
- **AND** Gemüse und Extras bleiben unverändert

### Requirement: Wizard für vorhandenes RefMeal mit dynamischen Drinks öffnen

**Vollständig ersetzt**: Rekonstruktion des neuen Drink-Formats.

Das System SHALL beim Öffnen eines vorhandenen RefMeals die Getränke-Items in das neue dynamische Drink-Format rekonstruieren. Alte RefMeals mit coffee/cocoa/tea-Format werden NICHT konvertiert (werden als leere Drink-Liste dargestellt).

#### Scenario: RefMeal mit neuen Getränke-Items
- **WHEN** ein RefMeal mit zwei Drink-Rezepten (Filterkaffee, Pfefferminztee) gespeichert wurde
- **THEN** werden beide Drinks in der dynamischen Liste rekonstruiert
- **AND** die Prozentwerte werden aus den ml-Mengen berechnet
- **AND** die Gesamt-ml wird aus der Summe rekonstruiert

#### Scenario: Altes RefMeal ohne Getränke
- **WHEN** ein RefMeal mit altem coffee/cocoa/tea-Format geladen wird
- **THEN** zeigt der Wizard eine leere Drink-Liste
- **AND** der Nutzer kann neue Drinks hinzufügen

## REMOVED Requirements

### Requirement: Schritt 4 — Getränke mit Milch-Zusammenrechnung

**Reason**: Milch wird aus Schritt 4 entfernt. Getränke sind nur noch reine Drinks ohne Milch-Zusatz. Milch kann ggf. außerhalb des Frühstücksassistenten als separates Item geplant werden.

**Migration**: Bestehende RefMeals mit Milch-Einträgen bleiben in der DB erhalten, werden aber nicht mehr in den Wizard geladen. Beim nächsten Speichern eines bearbeiteten Frühstücks entfallen die Milch-Einträge.

#### Scenario: Milch wird zusammengerechnet
- **WHEN** Kakao 200ml Milch und Müsli 150ml Milch pro Person benötigen
- **THEN** weist das System 350ml Milch als einen Eintrag aus

### Requirement: Wizard für vorhandenes RefMeal vollständig vorausgefüllt öffnen (altes Format)

**Reason**: Altes coffee/cocoa/tea-Format wird nicht mehr unterstützt. Nur das neue dynamische Drink-Format wird rekonstruiert.

**Migration**: Alte RefMeals werden beim Öffnen mit leerer Drink-Liste dargestellt.

#### Scenario: Wizard für vorhandenes RefMeal vollständig vorausgefüllt öffnen
- **WHEN** ein RefMeal für Frühstück existiert (mit Basis, Belag und Getränke-Items) und der Nutzer "Frühstücksassistent" klickt
- **THEN** öffnet sich der Wizard mit aus den MealItems rekonstruierten Mengen und Verteilungen für Basis, Belag UND Getränke (mlPerPerson, coffeePercent, cocoaPercent, teaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson)
- **AND** die Getränke-Slider in Schritt 4 zeigen die rekonstruierten Werte statt Default-Werte
