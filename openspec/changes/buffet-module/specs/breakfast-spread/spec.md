## MODIFIED Requirements

### Requirement: Content-Tag breakfast-fat

Das System SHALL Streichfette über den Rollen-Tag `buffet-fat` („Streichfett“) kennzeichnen. Zutaten mit diesem Tag SHALL im Frühstücksassistenten und im Buffet-Builder als Streichfette behandelt werden. Der frühere Tag `breakfast-fat` entfällt.

#### Scenario: Tag existiert nach Migration

- **WHEN** die Migrationen ausgeführt wurden
- **THEN** SHALL ein Tag mit slug `buffet-fat` und name „Streichfett“ existieren

#### Scenario: Zutat mit Tag erscheint im Katalog

- **WHEN** eine für den Nutzer sichtbare Zutat den Tag `buffet-fat` hat
- **THEN** SHALL sie im `GET /api/supply/breakfast-catalog/`-Response unter `fat_ingredients` erscheinen, unabhängig von `is_standalone_food`

### Requirement: BreakfastCatalogOut um fat_ingredients erweitert

Das System SHALL im `BreakfastCatalogOut`-Schema das Feld `fat_ingredients: list[FatIngredientOut]` liefern. Der Endpunkt `GET /api/supply/breakfast-catalog/` SHALL als Adapter auf die Buffet-Rollen arbeiten: `base_ingredients` ← `buffet-bread` (nur Zutaten), `fat_ingredients` ← `buffet-fat`, `topping_ingredients` ← `buffet-savory` ∪ `buffet-sweet`, `extra_ingredients` ← `buffet-fresh`, `drink_ingredients`/`drink_recipes` ← `buffet-drink`, `warm_meal_recipes` ← `buffet-dish` (nur Rezepte).

#### Scenario: Katalog enthält Streichfette

- **WHEN** `GET /api/supply/breakfast-catalog/` aufgerufen wird
- **THEN** SHALL `fat_ingredients` alle sichtbaren Zutaten mit Tag `buffet-fat` enthalten (sortiert nach name)
- **AND** SHALL jede Zutat `id`, `name`, `slug`, `energy_kcal`, `price_per_kg` und `portions` (nur aktive Portionen) enthalten

#### Scenario: Beläge aus beiden Belag-Rollen

- **WHEN** „Gouda“ die Rolle `buffet-savory` und „Nutella“ die Rolle `buffet-sweet` trägt
- **THEN** SHALL beide in `topping_ingredients` erscheinen
