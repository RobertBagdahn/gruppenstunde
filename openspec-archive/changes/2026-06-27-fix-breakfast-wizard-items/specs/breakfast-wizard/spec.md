## MODIFIED Requirements

### Requirement: Abschluss-Cockpit und Speichern

Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer vollständigen Transparenz-Tabelle anzeigen. Die Tabelle MUSS alle vier Komponentengruppen enthalten: Basis, Belag, warme Gerichte/Extras und Getränke — jeweils mit Position, Menge pro Person, kcal pro Person und prozentualem Anteil am Gesamt. Die Energieberechnung MUSS kcal aus allen Komponentengruppen summieren (nicht nur Basis und Belag). Die Hochrechnung (× Personen × Tage) sowie die Reste-Tabelle für Belag-Packungen bleiben erhalten.

Getränke werden als `recipe_id`-basierte Items (mit `recipe_type="drink"`) gespeichert, nicht als `display_name`-Items. Bei Bestätigung im RefMeal-Mode SHALL ein RefMeal erstellt und die Zusammenstellung als dessen MealItems gespeichert werden. Bei Bestätigung im DirectMeal-Mode SHALL die Zusammenstellung direkt als MealItems des Ziel-Meals gespeichert werden (bestehende Items werden ersetzt).

Zutaten-Items (Basis, Belag, Extras) MÜSSEN mit `measuring_unit_id` der Einheit "Gramm" gespeichert werden, damit das Backend die Energie/Kosten korrekt berechnen kann.

#### Scenario: RefMeal wird im RefMeal-Mode beim Abschluss erstellt
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt und der Wizard im RefMeal-Mode läuft
- **THEN** wird ein RefMeal mit `meal_type=breakfast` erstellt und die Komponenten als MealItems (Zutaten mit Gramm-Menge + measuring_unit_id, warme Gerichte mit recipe_id + Faktor, Getränke mit recipe_id + ml-Menge) gespeichert

#### Scenario: MealItems werden im DirectMeal-Mode direkt gespeichert
- **WHEN** der Nutzer im Cockpit "Frühstück speichern" wählt und der Wizard im DirectMeal-Mode läuft
- **THEN** ruft das System `POST /api/meal-plans/{planId}/meals/{mealId}/wizard-items/` mit allen Wizard-Items auf
- **AND** Zutaten-Items enthalten `measuring_unit_id` für die Einheit "Gramm"

#### Scenario: Zutaten-Energie wird korrekt berechnet
- **WHEN** der Wizard 150g Bauernbrot als Basis-Item speichert
- **THEN** berechnet das Backend die Energie aus `(kcal_pro_100g / 100) * 150g * factor`
- **AND** das Item hat einen sichtbaren `energy_kcal`-Wert im API-Response

## ADDED Requirements

### Requirement: `MealItemOut` liefert `energy_kcal` für Zutaten-Items

Das System SHALL für Zutaten-Items (ohne recipe_id) ebenfalls `energy_kcal` im API-Response ausliefern, basierend auf `ingredient.energy_kcal`, `quantity` und `measuring_unit`.

#### Scenario: Zutaten-Item hat energy_kcal
- **WHEN** ein MealItem mit ingredient_id, quantity=250 und measuring_unit.name="g" abgefragt wird
- **THEN** enthält der Response `energy_kcal` berechnet aus `(ingredient.energy_kcal / 100) * 250 * factor`
