## Purpose

Historischer Verweis auf das entfernte MealItemSplit-Modell.

## Requirements

### Requirement: MealItemSplit ist entfernt

`MealItemSplit`, seine CRUD-Endpunkte und die Split-Berechnungslogik SHALL nicht mehr verwendet
werden. Varianten werden als eigenständige `MealItem`-Einträge mit `factor`,
`active_recipe_item_ids` und `variant_group_id` gespeichert.

#### Scenario: Variantenmodell
- **WHEN** Varianten für ein MealItem gespeichert werden
- **THEN** verwendet das System die Definition aus `variant-items` statt eines Split-Modells
