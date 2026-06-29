## MODIFIED Requirements

### Requirement: Abschluss-Cockpit und Speichern

Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer vollständigen Transparenz-Tabelle anzeigen. Die Tabelle MUSS alle vier Komponentengruppen enthalten: Basis, Belag, warme Gerichte/Extras und Getränke — jeweils mit Position, Menge pro Person, kcal pro Person und prozentualem Anteil am Gesamt (ohne Getränke). Die Energieberechnung MUSS kcal aus Basis, Belag und Extras summieren. Getränke SHALL separat unter einem eigenen Abschnitt mit kcal-Angabe aber ohne Coverage-Einfluss dargestellt werden.

Zutaten-Items (Basis, Belag, Extras) MÜSSEN mit Portions-basierten `measuring_unit_id` gespeichert werden: "Scheibe" für Brot, "Portion" (bzw. "Belag knapp/normal/üppig") für Belag, "Tasse (200ml)" für Getränke, "Schuss (30ml)" für Milch. `quantity` MUSS den Pro-Person-Anteil in Portionen repräsentieren (sharePercent/100), NICHT Gramm. `factor` MUSS 1.0 sein.

Bei Bestätigung im RefMeal-Mode SHALL ein RefMeal erstellt und die Zusammenstellung als dessen MealItems gespeichert werden. Bei Bestätigung im DirectMeal-Mode SHALL die Zusammenstellung direkt als MealItems des Ziel-Meals gespeichert werden (bestehende Items werden ersetzt).

#### Scenario: Cockpit-Tabelle zeigt alle Komponentengruppen ohne Getränke in Coverage
- **WHEN** der Nutzer im Cockpit ist und Getränke, warme Gerichte und Extras konfiguriert hat
- **THEN** zeigt die Transparenz-Tabelle Zeilen für Basis-Sorten, Belag-Sorten, warme Gerichte und Extras-Zutaten mit ihren jeweiligen Mengen und kcal
- **AND** Getränke werden in einem separaten Abschnitt mit eigener kcal-Zeile dargestellt
- **AND** die Getränke-kcal fließen NICHT in die Gesamt-Coverage ein

#### Scenario: Energieberechnung summiert Basis+Belag+Extras (ohne Getränke)
- **WHEN** Basis 200 kcal, Belag 150 kcal, Extras 80 kcal und Getränke 50 kcal pro Person ergeben
- **THEN** zeigt das Cockpit 430 kcal als Gesamt-Ist (200+150+80) für die Soll-Ist-Berechnung
- **AND** die Getränke werden separat unter "Getränke" mit 50 kcal aufgeführt

#### Scenario: Zutaten-Items werden mit Portions-Einheiten gespeichert
- **WHEN** der Wizard speichert
- **THEN** Basis-Items haben `measuring_unit_id` der Einheit "Scheibe", `quantity = sharePercent/100`
- **AND** Belag-Items haben `measuring_unit_id` der Intensitäts-Portion ("Belag normal"), `quantity = sharePercent/100`
- **AND** Getränke-Items haben `measuring_unit_id` der Einheit "Tasse (200ml)"
- **AND** alle Items haben `factor = 1.0`

#### Scenario: Die Anzeige im MealPlan zeigt Portionsmenge
- **WHEN** ein gespeichertes Basis-Item im MealPlan dargestellt wird
- **THEN** zeigt die Anzeige `×1,4 Scheiben (25g)` — Portionsmenge mit quantity_g in Klammern

### Requirement: Soll-Energie über Norm-Person-Konstante

Das System SHALL das Energie-Soll je Frühstück als `NORM_PERSON_DAILY_KCAL × day_part_factor` berechnen und Ist gegen Soll als Ampel darstellen. Der Wert 2335 (Norm-Person, PAL 1.75) MUSS als benannte Konstante `NORM_PERSON_DAILY_KCAL` zentral definiert und überall referenziert werden. Die Ist-Berechnung SHALL NUR Basis, Belag und Extras umfassen. Getränke-kcal werden separat ausgewiesen, fließen aber NICHT in die Coverage ein.

#### Scenario: Soll basiert auf Norm-Person und day_part_factor
- **WHEN** `day_part_factor = 0.25` gilt
- **THEN** beträgt das Frühstücks-Soll ca. 584 kcal (NORM_PERSON_DAILY_KCAL × 0.25)

#### Scenario: Getränke-kcal zählen nicht zum Frühstücks-Soll
- **WHEN** Basis+Belag+Extras 500 kcal und Getränke 50 kcal pro Person ergeben
- **THEN** zeigt die Coverage 500/584 ≈ 86% (Getränke werden ausgeklammert)

### Requirement: Normalisieren skaliert nur Basis und Belag

Das System SHALL beim Normalisieren auf das Soll Basis-BE und Belag-Portionen mit dem Faktor `Soll/Ist` multiplizieren, wobei Soll und Ist NUR kcal aus Basis und Belag umfassen (ohne Extras und Getränke). Extras, warme Rezepte und Getränke-Mengen MÜSSEN dabei unverändert bleiben. Die Belag-Deckung MUSS erhalten bleiben.

#### Scenario: Normalisieren skaliert nur Basis und Belag
- **WHEN** Ist 380 kcal (Basis+Belag), Extras 80 kcal, Getränke 50 kcal — Soll 584 kcal
- **THEN** werden nur Basis-BE und Belag-Portionen mit Faktor 584/380 ≈ 1,54 skaliert
- **AND** Extras, warme Rezepte und Getränke-Mengen bleiben unverändert

#### Scenario: Normalisieren erhält Belag-Deckung
- **WHEN** Ist (Basis+Belag) 380 kcal und Soll 584 kcal beträgt (Faktor 1,54)
- **THEN** werden Basis-BE und Belag-Portionen gleich skaliert, sodass die Deckung 100% bleibt

### Requirement: Brot-Einheit als Recheneinheit

Das System SHALL eine Brot-Einheit (BE) als belegbare Fläche definieren: 1 Scheibe = 1 BE, ½ Brötchen = 1 BE, ganzes Brötchen = 2 BE. Eine Belag-Portion SHALL genau 1 BE decken. Basis- und Belag-Items werden in Portionen gespeichert (quantity = sharePercent/100), nicht in Gramm.

#### Scenario: Basis-Item als Portion gespeichert
- **WHEN** der Nutzer 14% Bauernbrot im Wizard konfiguriert
- **THEN** wird das Item mit `quantity = 0.14`, `measuring_unit = "Scheibe"` gespeichert
- **AND** die Energieberechnung erfolgt über `portion.weight_g × quantity × effective_portions`

## REMOVED Requirements

### Requirement: Zutaten-Items mit measuring_unit_id "Gramm" speichern

**Reason**: Ersetzt durch Portions-basierte Speicherung (Scheibe, Portion, Tasse, Schuss). Das Gramm-Gewicht wird als `quantity_g` aus der Portion abgeleitet.
**Migration**: Alte Items mit `measuring_unit="g"` bleiben bestehen, aber neue Wizard-Saves verwenden Portions-Einheiten. Die Anzeige zeigt bei "g"-Items nur Gramm ohne Portionsnamen.

## ADDED Requirements

### Requirement: Portion Auto-Anlage im Wizard-Endpoint

Das System SHALL beim Aufruf von `POST /api/meal-plans/{planId}/meals/{mealId}/wizard-items/` für jede übergebene `ingredient_id` prüfen, ob eine Portion mit dem angeforderten `measuring_unit_id` existiert. Falls nicht, SHALL die Portion automatisch und idempotent angelegt werden (Portion-Name = measuring_unit-Name, `weight_g` aus Ingredient-Daten oder Catalog).

#### Scenario: Fehlende Portion wird automatisch angelegt
- **WHEN** der Wizard ein Basis-Item mit `measuring_unit_id=Scheibe` sendet und diese Portion für das Ingredient nicht existiert
- **THEN** legt das Backend eine Portion(name="Scheibe", measuring_unit=Scheibe, weight_g=standard_recipe_weight_g) für dieses Ingredient an
- **AND** das MealItem wird normal erstellt

#### Scenario: Existierende Portion wird nicht dupliziert
- **WHEN** die Portion bereits existiert
- **THEN** wird keine neue Portion angelegt
- **AND** das MealItem verwendet die existierende Portion

### Requirement: Warnung bei Coverage > 120%

Das System SHALL im Cockpit eine gelbe Warnbox anzeigen, wenn die Energie-Coverage (Basis+Belag vs. Soll) 120% überschreitet. Die Warnbox SHALL den Text "Zu viele Kalorien (XX%). Mit 'Normalisieren' auf Soll anpassen?" enthalten und einen Button zum Normalisieren anbieten.

#### Scenario: Coverage über 120% zeigt Warnung
- **WHEN** die Coverage (Basis+Belag/Soll) 126% beträgt
- **THEN** erscheint eine gelbe Warnbox mit Normalisieren-Button

#### Scenario: Coverage unter 120% zeigt keine Warnung
- **WHEN** die Coverage 95% beträgt
- **THEN** erscheint keine Warnbox (nur der normale Normalisieren-Button und der Coverage-Balken)

### Requirement: MealItemOut liefert quantity_g

Das System SHALL `MealItemOut` um das Feld `quantity_g: float | None` erweitern. Für ingredient-Items SHALL `quantity_g = portion.weight_g × quantity × effective_portions` sein. Für recipe-Items SHALL `quantity_g` aus dem Rezept-Gesamtgewicht berechnet werden. Falls keine Portion oder kein Rezeptgewicht ermittelbar ist, SHALL `quantity_g` None sein.

#### Scenario: Ingredient item mit quantity_g
- **WHEN** ein MealItem mit quantity=0.14, measuring_unit="Scheibe" (18g), effective_portions=10 abgefragt wird
- **THEN** enthält der Response `quantity_g = 25.2`

#### Scenario: Recipe item mit quantity_g
- **WHEN** ein MealItem mit recipe_id=Kaffee, factor=1.0, effective_portions=10 abgefragt wird
- **THEN** enthält der Response `quantity_g` aus dem Rezept-Gesamtgewicht × factor × effective_portions
