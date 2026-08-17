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

- **WHEN** der Planer `PUT /{meal_plan_id}/meal-items/{id}/splits/` mit Splits aufruft, deren Summe ≠ 1.0 ist
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

### Requirement: Nährwertberechnung per Delta-Ansatz

Das System SHALL bei MealItems mit Splits die Nährwerte/Kosten live per Delta-Ansatz berechnen: Basiswert des Rezepts (aus `Recipe.cached_*`) plus/minus die Differenz pro getauschtem Exchange-Glied bzw. anteilig reduziert pro optionaler Zutat. Kein zusätzlicher Cache am MealItem.

#### Scenario: Delta-Nährwert mit Exchange-Split

- **WHEN** für ein MealItem Nährwerte angefordert werden und Exchange-Splits vorhanden sind
- **THEN** berechnet das System pro getauschtem Glied `delta = share × (glied_zutat_pro_portion − default_glied_pro_portion)` und addiert die Summe der Deltas zum gecachten Basiswert; das Ergebnis ist ein einzelner Wert pro Normportion

#### Scenario: Delta-Nährwert mit optionaler Zutat

- **WHEN** eine optionale Zutat mit `share < 1.0` gesetzt ist
- **THEN** wird der Beitrag dieser Zutat anteilig (`1 − share`) vom gecachten Basiswert abgezogen

#### Scenario: Nährwert ohne Split wie bisher

- **WHEN** ein MealItem keine Splits hat
- **THEN** werden die gecachten Nährwerte des Rezepts (`Recipe.cached_energy_total_kcal` etc.) wie bisher verwendet, ohne Live-Berechnung

### Requirement: Split-Daten über API CRUD

Das System SHALL Endpunkte bereitstellen um Splits für ein MealItem zu lesen, zu setzen und zu löschen. Nur Nutzer mit Schreibrecht auf den MealPlan dürfen Splits schreiben.

#### Scenario: Splits lesen

- **WHEN** `GET /{meal_plan_id}/meal-items/{id}/splits/` aufgerufen wird
- **THEN** gibt das Backend alle `MealItemSplit`-Einträge für dieses MealItem zurück

#### Scenario: Splits setzen (ersetzt alle)

- **WHEN** `PUT /{meal_plan_id}/meal-items/{id}/splits/` mit einem vollständigen Split-Array aufgerufen wird
- **THEN** werden alle bestehenden Splits für dieses MealItem ersetzt; Constraint-Prüfung erfolgt atomar

#### Scenario: Splits löschen

- **WHEN** `DELETE /{meal_plan_id}/meal-items/{id}/splits/` aufgerufen wird
- **THEN** werden alle Splits für dieses MealItem gelöscht; das MealItem fällt zurück auf Default-Verhalten

#### Scenario: Unautorisierter Zugriff

- **WHEN** ein Nutzer ohne Schreibrecht auf den MealPlan `PUT /{meal_plan_id}/meal-items/{id}/splits/` aufruft
- **THEN** antwortet das Backend mit HTTP 403

### Requirement: MealItemSplit und MealItemOverride schließen sich aus

Das System MUST verhindern, dass für dasselbe RecipeItem sowohl ein `MealItemSplit` (bzw. Exchange/Optional) als auch ein `MealItemOverride` gesetzt wird. Ein `MealItemOverride` darf NICHT auf einem RecipeItem erstellt werden, das `is_optional=True` ist oder zu einer `exchange_group` gehört.

#### Scenario: Override auf Split-Zutat blockiert

- **WHEN** der Planer einen `MealItemOverride` auf einem RecipeItem setzt, das optional oder Teil einer Exchange-Gruppe ist
- **THEN** gibt das Backend HTTP 400 zurück mit Fehlermeldung "Für Varianten- oder optionale Zutaten kann kein Override gesetzt werden."

#### Scenario: Override auf normaler Zutat weiterhin erlaubt

- **WHEN** der Planer einen `MealItemOverride` auf einem RecipeItem setzt, das weder optional noch Teil einer Exchange-Gruppe ist
- **THEN** wird der Override wie bisher angelegt
