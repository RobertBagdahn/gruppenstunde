## MODIFIED Requirements

### Requirement: Wizard-Einstieg über RefMeal-Frühstück

Das System SHALL den Frühstücks-Wizard über zwei Routen öffnen:
1. `/meal-plans/:id/ref-meals/breakfast/wizard` — speichert als RefMeal und öffnet entweder einen leeren Wizard (kein RefMeal vorhanden) oder einen mit vorhandenen Daten vorausgefüllten Wizard (RefMeal existiert)
2. `/meal-plans/:id/meals/:mealId/breakfast-wizard` — speichert direkt in das angegebene Meal (DirectMeal-Mode), kein RefMeal-Bezug

#### Scenario: Wizard ohne vorhandenes RefMeal öffnen (RefMeal-Mode)
- **WHEN** kein RefMeal für `meal_type=breakfast` existiert und der Nutzer "Referenz-Mahlzeit erstellen" klickt
- **THEN** öffnet sich der Frühstücks-Wizard bei Schritt 1 (Basis) mit leerem Zustand
- **AND** es wird noch kein RefMeal in der Datenbank erstellt

#### Scenario: Wizard für vorhandenes RefMeal vorausgefüllt öffnen (RefMeal-Mode)
- **WHEN** ein RefMeal für Frühstück existiert und der Nutzer "Frühstücksassistent" klickt
- **THEN** öffnet sich der Wizard mit aus den MealItems rekonstruierten Mengen und Verteilungen

#### Scenario: Wizard im DirectMeal-Mode startet immer mit leerem Zustand
- **WHEN** der Wizard über `/meal-plans/:id/meals/:mealId/breakfast-wizard` aufgerufen wird
- **THEN** startet der Wizard mit einem leeren Zustand (keine Rekonstruktion aus MealItems)
- **AND** der Progress-Bar und alle Steps sind identisch zum RefMeal-Mode

### Requirement: Abschluss-Cockpit und Speichern

Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer Transparenz-Tabelle (Komponente, Menge, Gewicht, kcal, Anteil) sowie der Hochrechnung (× Personen × Tage) anzeigen. Bei Bestätigung im RefMeal-Mode SHALL ein RefMeal erstellt und die Zusammenstellung als dessen MealItems gespeichert werden. Bei Bestätigung im DirectMeal-Mode SHALL die Zusammenstellung direkt als MealItems des Ziel-Meals gespeichert werden (bestehende Items werden ersetzt).

#### Scenario: RefMeal wird im RefMeal-Mode beim Abschluss erstellt
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt und der Wizard im RefMeal-Mode läuft
- **THEN** wird ein RefMeal mit `meal_type=breakfast` erstellt und die Komponenten als MealItems (Zutaten mit Gramm/ml-Menge, warme Gerichte mit recipe_id + Faktor) gespeichert

#### Scenario: MealItems werden im DirectMeal-Mode direkt gespeichert
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt und der Wizard im DirectMeal-Mode läuft
- **THEN** ruft das System `POST /api/meal-plans/{planId}/meals/{mealId}/wizard-items/` mit allen Wizard-Items auf
- **AND** nach erfolgreichem Save wird zu `/meal-plans/{planId}` navigiert

#### Scenario: Abbrechen hinterlässt keine Daten
- **WHEN** der Nutzer den Wizard ohne Abschluss verlässt (egal welcher Mode)
- **THEN** wird kein RefMeal und werden keine MealItems erstellt
