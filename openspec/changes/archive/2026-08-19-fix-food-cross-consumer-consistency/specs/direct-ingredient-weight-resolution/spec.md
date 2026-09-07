# direct-ingredient-weight-resolution Specification (Delta)

## ADDED Requirements

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
`nutrition_summary` und `shopping_service`. Es SHALL NICHT zusätzlich durch
`norm_portions` dividiert werden.

#### Scenario: portion_display zeigt Pro-Person-Menge

- **GIVEN** einen MealItem mit Direktzutat, `quantity=180`, `measuring_unit.name="g"`, `effective_portions=10`
- **WHEN** `MealItemOut.resolve_portion_display` aufgerufen wird
- **THEN** SHALL die Anzeige auf `180g` pro Person basieren und nicht durch 10 dividiert werden
