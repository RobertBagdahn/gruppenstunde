# direct-ingredient-weight-resolution Specification

## Purpose

Ein kanonischer Helper `_resolve_ingredient_weight_g` aus `planner/services/meal_item_helpers.py` MUSS in allen drei Berechnungsbereichen (nutrition_summary, cost_summary, shopping_service) für Direktzutaten verwendet werden. Eigene Inline-Implementierungen werden entfernt.

## Requirements

### Requirement: shopping_service nutzt kanonischen Gewichts-Helper

Das System SHALL `_resolve_ingredient_weight_g` aus `meal_item_helpers.py` im `shopping_service.generate_shopping_list` für den Direktzutat-Zweig verwenden statt `measuring_unit.quantity` als Gewichtsfaktor.

#### Scenario: Direktzutat mit g-Einheit, quantity=1.0

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=180`, `measuring_unit.name="g"`, `measuring_unit.quantity=1.0`, `factor=1.0`
- **AND** ein Plan mit `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 180 * 1.0 * (10 * 1.1) = 1980g` sein

#### Scenario: Direktzutat mit Portionseinheit

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=2`, `measuring_unit.name="Scheibe"`, Portion mit `weight_g=35g`, `factor=1.0`
- **AND** ein Plan mit `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 2 * 35 * 1.0 * (10 * 1.1) = 770g` sein

#### Scenario: MeasuringUnit mit quantity > 1 wird korrekt behandelt

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=3`, `measuring_unit.name="500g Packung"`, `measuring_unit.quantity=500`, Portion mit `weight_g=500g`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL die Gewichtsberechnung über `_resolve_ingredient_weight_g` laufen (Portion-Lookup, nicht `measuring_unit.quantity` direkt)

### Requirement: cost_summary nutzt kanonischen Gewichts-Helper

Das System SHALL `_resolve_ingredient_weight_g` aus `meal_item_helpers.py` im `cost_summary`-Direktzutat-Zweig verwenden.

#### Scenario: Direktzutat mit ml-Einheit und density

- **GIVEN** ein `MealItem` mit `ingredient` (energy_kcal=42/100g, `density=1.03`), `quantity=200`, `measuring_unit.name="ml"`, `factor=1.0`
- **AND** eine Mahlzeit mit `effective_portions=10`
- **WHEN** `cost_summary` berechnet wird
- **THEN** SHALL `weight_g = 200 * 1.03 = 206g` für die Preisberechnung verwendet werden

#### Scenario: Konsistenz zwischen cost_summary und nutrition_summary

- **GIVEN** dieselbe Direktzutat mit identischen Feldern
- **WHEN** `nutrition_summary` und `cost_summary` berechnet werden
- **THEN** SHALL das verwendete `weight_g` in beiden Bereichen identisch sein

### Requirement: nutrition_summary prefetcht Portionen für Direktzutaten

Das System SHALL `ingredient__portions` zum Prefetch-Chain in `nutrition_summary` hinzufügen, sodass `_resolve_ingredient_weight_g` keine zusätzlichen DB-Queries verursacht.

#### Scenario: Kein N+1 bei mehreren Direktzutaten

- **GIVEN** ein Plan mit 10 Direktzutaten (ingredient-MealItems) in einer Mahlzeit
- **WHEN** `GET /api/meal-plans/{id}/nutrition-summary/` aufgerufen wird
- **THEN** SHALL die Anzahl der DB-Queries unabhängig von der Anzahl der Direktzutaten konstant bleiben (kein N+1)

### Requirement: Rezepte mit portions=0 werden geskippt

Das System SHALL Rezepte mit `portions=0` oder `portions=None` in nutrition_summary, cost_summary und shopping_service aus der Berechnung ausschließen und ein Warning loggen.

#### Scenario: Rezept mit portions=0 trägt nichts bei

- **GIVEN** ein `MealItem` mit einem Rezept das `portions=0` hat
- **WHEN** `nutrition_summary`, `cost_summary` oder Einkaufsliste berechnet wird
- **THEN** SHALL dieses Rezept keinen Beitrag zu Nährwerten, Kosten oder Einkaufsmengen leisten
- **AND** SHALL ein `logger.warning` ausgegeben werden

#### Scenario: Rezept mit portions=1 bleibt unverändert

- **GIVEN** ein `MealItem` mit einem Rezept das `portions=1` hat
- **WHEN** Berechnungen ausgeführt werden
- **THEN** SHALL das Rezept normal skaliert werden (keine Änderung gegenüber bisherigem Verhalten)

### Requirement: Gewichts-Helper schließt soft-deleted Portionen aus

`_resolve_ingredient_weight_g` aus `planner/services/meal_item_helpers.py` SHALL beim
Portion-Lookup ausschließlich aktive Portionen (`deleted_at IS NULL`) berücksichtigen —
sowohl im Cache-Pfad als auch im direkten DB-Pfad. Dadurch liefern
`resolve_ingredient_energy_kcal`, `resolve_ingredient_cost_eur`, Kochplan und Kochplan-PDF
keine Gewichte über soft-gelöschte Portionen.

#### Scenario: Soft-deleted Portion wird beim Lookup übersprungen

- **GIVEN** einen MealItem mit `ingredient` und `measuring_unit`, bei dem die passende Portion soft-gelöscht ist
- **AND** eine aktive `rank=1`-Portion derselben Zutat existiert
- **WHEN** `_resolve_ingredient_weight_g` ohne Cache aufgerufen wird
- **THEN** SHALL die soft-gelöschte Portion ignoriert und auf die aktive Default-Portion zurückgegriffen werden

#### Scenario: Konsistenz zwischen Cache- und Direkt-Pfad

- **GIVEN** denselben MealItem mit einer soft-gelöschten passenden Portion
- **WHEN** `_resolve_ingredient_weight_g` einmal mit und einmal ohne `portion_cache` aufgerufen wird
- **THEN** SHALL beide Aufrufe dasselbe Gewicht liefern

### Requirement: portion_display interpretiert quantity pro Person

`MealItemOut.resolve_portion_display` SHALL `MealItem.quantity` als Pro-Person-Menge
interpretieren, konsistent mit `resolve_ingredient_energy_kcal`, `cost_summary`,
`nutrition_summary` und `shopping_service`. Es SHALL NICHT zusätzlich durch `norm_portions`
dividiert werden.

#### Scenario: portion_display zeigt Pro-Person-Menge

- **GIVEN** einen MealItem mit Direktzutat, `quantity=180`, `measuring_unit.name="g"`, `effective_portions=10`
- **WHEN** `MealItemOut.resolve_portion_display` aufgerufen wird
- **THEN** SHALL die Anzeige auf `180g` pro Person basieren und nicht durch 10 dividiert werden
