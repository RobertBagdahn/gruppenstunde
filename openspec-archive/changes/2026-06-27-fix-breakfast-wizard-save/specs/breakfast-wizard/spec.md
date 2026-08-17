## MODIFIED Requirements

### Requirement: Abschluss-Cockpit und Speichern
Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer Transparenz-Tabelle (Komponente, Menge, Gewicht, kcal, Anteil) sowie der Hochrechnung (× Personen × Tage) anzeigen. Erst bei Bestätigung SHALL das RefMeal erstellt und die Zusammenstellung als MealItems gespeichert werden. Getränke (Kaffee, Kakao, Tee, Saft, Milch) MÜSSEN als MealItems im RefMeal persistiert werden. Nach erfolgreichem Speichern SHALL der Nutzer zum RefMeal-Editor weitergeleitet werden.

#### Scenario: RefMeal wird erst beim Abschluss erstellt
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt
- **THEN** wird ein RefMeal mit `meal_type=breakfast` erstellt und die Komponenten als MealItems (Zutaten mit Gramm/ml-Menge, warme Gerichte mit recipe_id + Faktor, Getränke mit display_name + quantity) gespeichert

#### Scenario: Getränke werden gespeichert
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt und Getränke (z.B. 40% Kaffee, 30% Kakao, 30% Tee, 300ml/Person) konfiguriert hat
- **THEN** werden die Getränke als MealItems mit `display_name` (z.B. "Kaffee", "Kakao", "Tee") und `quantity` (ml pro Person) im RefMeal gespeichert

#### Scenario: Redirect nach Speichern zum RefMeal-Editor
- **WHEN** der Nutzer "Frühstück speichern" erfolgreich abschließt
- **THEN** wird er zum RefMeal-Editor des gespeicherten RefMeals weitergeleitet (`/meal-plans/:id/ref-meals/:refMealId/edit`)

#### Scenario: Abbrechen hinterlässt keine Daten
- **WHEN** der Nutzer den Wizard ohne Abschluss verlässt
- **THEN** wird kein RefMeal und werden keine MealItems erstellt
