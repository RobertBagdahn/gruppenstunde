## ADDED Requirements

### Requirement: Planer konfiguriert Portionen-Split beim Einplanen

Wenn ein Rezept mindestens eine Exchange-Gruppe oder optionale Zutat hat, SHALL beim Hinzufügen zum Essensplan sofort ein Konfigurations-Dialog erscheinen. Der Dialog zeigt alle Exchange-Gruppen und optionalen Zutaten mit vorausgefüllten Defaults (100% Original / 100% da).

#### Scenario: Dialog erscheint bei Exchange-Gruppen

- **WHEN** der Planer ein Rezept mit mindestens einer Exchange-Gruppe zum Meal hinzufügt
- **THEN** öffnet sich der Split-Konfigurations-Dialog mit allen Exchange-Ketten; Defaults sind vorausgefüllt

#### Scenario: Dialog erscheint bei optionalen Zutaten

- **WHEN** der Planer ein Rezept mit mindestens einer optionalen Zutat zum Meal hinzufügt
- **THEN** öffnet sich der Split-Konfigurations-Dialog mit allen optionalen Zutaten; Default ist "100% eingeschlossen"

#### Scenario: Kein Dialog ohne Exchanges/Optionals

- **WHEN** der Planer ein Rezept ohne Exchange-Gruppen und ohne optionale Zutaten zum Meal hinzufügt
- **THEN** wird das Rezept direkt ohne Dialog hinzugefügt

### Requirement: Split als Anteil gespeichert

Das System SHALL Portionen-Splits als float-Anteile (0.0–1.0) in `MealItemSplit` speichern. Die Constraint `Σ share = 1.0` pro Exchange-Gruppe bzw. optionaler Zutat MUST vom Backend erzwungen werden.

#### Scenario: Split-Constraint gewahrt

- **WHEN** der Planer `PUT /api/meal-items/{id}/splits/` mit Splits aufruft, deren Summe ≠ 1.0 ist
- **THEN** gibt das Backend HTTP 400 zurück mit Fehlermeldung "Die Summe der Anteile muss 100% ergeben."

#### Scenario: Split-Constraint erfüllt

- **WHEN** der Planer Splits mit Σ share = 1.0 speichert
- **THEN** werden die Splits mit HTTP 200 bestätigt

#### Scenario: Kein Split-Eintrag → 100% Default

- **WHEN** für eine Exchange-Gruppe keine `MealItemSplit`-Einträge existieren
- **THEN** wird das Original-Glied (exchange_position=0) für 100% der Portionen verwendet

### Requirement: Proportionale Skalierung bei Portionsänderung

Wenn die Gesamtportionen eines MealPlans oder Meals geändert werden, MUST das System die gespeicherten Anteile beibehalten und die angezeigten Portionen proportional neu berechnen.

#### Scenario: Portionsänderung skaliert Splits proportional

- **WHEN** ein Plan mit 10 Portionen (Split: 80% normal / 20% vegan) auf 15 Portionen geändert wird
- **THEN** zeigt der Split 12 Portionen normal / 3 Portionen vegan (Anteile 80%/20% bleiben erhalten)

#### Scenario: Largest-Remainder verhindert Summen-Fehler

- **WHEN** ein Split mit krummen Portionen gerendert wird (z.B. 20% von 11 = 2,2)
- **THEN** rundet das System via Largest-Remainder auf ganze Portionen; die Summe entspricht exakt den effective_portions

### Requirement: Einkaufsliste berechnet Mengen split-bewusst

Das System SHALL die Einkaufslisten-Mengen pro Zutat unter Berücksichtigung der `MealItemSplit`-Anteile berechnen.

#### Scenario: Exchange-Split in der Einkaufsliste

- **WHEN** ein MealItem mit Exchange-Split (8× Parmesan / 2× Hefeflocken) in der Einkaufsliste erscheint
- **THEN** wird Parmesan mit Menge × 8/10 × effective_portions × reserve_factor berechnet; Hefeflocken mit Menge × 2/10 × effective_portions × reserve_factor

#### Scenario: Optionale Zutat mit Split "0 da" nicht in Einkaufsliste

- **WHEN** eine optionale Zutat mit share=0.0 gesetzt ist
- **THEN** erscheint die Zutat nicht in der Einkaufsliste

#### Scenario: Gemeinsame Zutaten ohne Split unverändert

- **WHEN** ein RecipeItem weder optional noch in einer Exchange-Gruppe ist
- **THEN** wird es für 100% der Portionen mit der vollen Menge in die Einkaufsliste übernommen

### Requirement: Nährwertberechnung als gewichteter Durchschnitt

Das System SHALL bei MealItems mit Splits die Nährwerte als gewichteten Durchschnitt live berechnen. Kein Cache — immer direkt aus den Zutaten-Nährwerten und den Anteilen.

#### Scenario: Gewichteter Nährwert mit Exchange-Split

- **WHEN** ein MealItem Nährwerte angefordert werden und Exchange-Splits vorhanden sind
- **THEN** berechnet das System `Σ (share_i × ingredient_i.energy_kcal × weight_i_per_portion)` für alle Glieder; das Ergebnis ist ein einzelner kcal-Wert pro Normportion

#### Scenario: Nährwert ohne Split wie bisher

- **WHEN** ein MealItem keine Splits hat
- **THEN** werden die gecachten Nährwerte des Rezepts (`Recipe.cached_energy_kcal`) verwendet

### Requirement: Split-Daten über API CRUD

Das System SHALL Endpunkte bereitstellen um Splits für ein MealItem zu lesen, zu setzen und zu löschen. Nur Nutzer mit Schreibrecht auf den MealPlan dürfen Splits schreiben.

#### Scenario: Splits lesen

- **WHEN** `GET /api/meal-items/{id}/splits/` aufgerufen wird
- **THEN** gibt das Backend alle `MealItemSplit`-Einträge für dieses MealItem zurück

#### Scenario: Splits setzen (ersetzt alle)

- **WHEN** `PUT /api/meal-items/{id}/splits/` mit einem vollständigen Split-Array aufgerufen wird
- **THEN** werden alle bestehenden Splits für dieses MealItem ersetzt; Constraint-Prüfung erfolgt atomar

#### Scenario: Splits löschen

- **WHEN** `DELETE /api/meal-items/{id}/splits/` aufgerufen wird
- **THEN** werden alle Splits für dieses MealItem gelöscht; das MealItem fällt zurück auf Default-Verhalten

#### Scenario: Unautorisierter Zugriff

- **WHEN** ein Nutzer ohne Schreibrecht auf den MealPlan `PUT /api/meal-items/{id}/splits/` aufruft
- **THEN** antwortet das Backend mit HTTP 403
