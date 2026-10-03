# shopping-list Specification

## Purpose

This specification defines the shopping list data model, API schemas, permissions, and frontend behavior for collaborative shopping lists.
## Requirements
### Requirement: Aktive Gewichtsauflösung

Direkt- und Rezeptzutaten SHALL denselben kanonischen Gewichts-Helper verwenden. Soft-gelöschte
Portionen und Packungen sind keine Fallbacks; fehlendes gültiges Gewicht darf nicht als
`measuring_unit.quantity` interpretiert werden. Details zur gemeinsamen Berechnung stehen in
`food-calculation-consistency`.

#### Scenario: Gelöschte Portion wird ignoriert
- **WHEN** die bevorzugte Portion soft-gelöscht ist
- **THEN** verwendet die Einkaufsliste keine gelöschte Portion als Fallback

### Requirement: Direktzutat-Gewicht über kanonischen Helper

Das System SHALL für Direktzutaten (`MealItem.ingredient`) im Shopping Service `_resolve_ingredient_weight_g` aus `planner/services/meal_item_helpers.py` verwenden statt einer eigenen Inline-Berechnung. `measuring_unit.quantity` DARF NICHT als Gewicht verwendet werden.

#### Scenario: Direktzutat mit g-Einheit, korrekte Skalierung

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=180`, `measuring_unit.name="g"`, `factor=1.0`
- **AND** ein Plan mit `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 180 * 1.0 * (10 * 1.1) = 1980g` sein

#### Scenario: Direktzutat mit Portionseinheit

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=2`, `measuring_unit="Scheibe"`, Portion `weight_g=35g`, `factor=1.0`
- **AND** `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 2 * 35 * 1.0 * 11 = 770g` sein

#### Scenario: Direktzutat mit ml-Einheit und density

- **GIVEN** ein `MealItem` mit `ingredient` (`density=1.03`), `quantity=200`, `measuring_unit.name="ml"`, `factor=1.0`
- **AND** `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 200 * 1.03 * 1.0 * 11 = 2266g` sein

### Requirement: List schema exposes can_edit and can_delete
The shopping list list item response schema (`ShoppingListOut` in list endpoints) SHALL include `can_edit: bool` and `can_delete: bool` fields resolved server-side based on the user's relationship to the shopping list (owner, collaborator role, staff status).

#### Scenario: Shopping list list includes permission fields
- **WHEN** a client fetches `GET /api/shopping-lists/`
- **THEN** each item in the response MUST include `can_edit` and `can_delete`
- **THEN** `can_edit` SHALL be `true` for lists where the user has editor or admin access
- **THEN** `can_edit` SHALL be `false` for lists where the user only has viewer access or no access

### Requirement: Anzeigemenge aus Gramm und Dichte
`ShoppingListItemOut` und `ShoppingListItemSourceOut` MUST die Anzeigemenge (`quantity`, `unit`) für Einträge mit Zutat immer aus `quantity_g` über `shopping_quantity(quantity_g, ingredient)` ableiten, unabhängig vom gespeicherten Feld `unit`. Nur Freitext-Einträge ohne Zutat DÜRFEN `quantity_g` mit dem gespeicherten `unit` unverändert anzeigen. Eine aus einem Essensplan erzeugte Einkaufsliste MUST für jede Zutat dieselbe Menge und Einheit zeigen wie der Einkaufen-Tab des Plans.

#### Scenario: Honig in der erzeugten Liste
- **GIVEN** ein Essensplan benötigt 273 g „Blütenhonig“ mit Dichte 1,4
- **WHEN** ein angemeldeter Nutzer daraus eine Einkaufsliste erstellt
- **THEN** zeigen Einkaufen-Tab und Liste beide 195 ml

#### Scenario: Freitext-Eintrag
- **WHEN** ein Nutzer den Freitext „Grillkohle“ ohne Zutat mit 3 kg anlegt
- **THEN** zeigt die Liste 3 kg

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Besucher `GET /api/shopping-lists/{id}/` aufruft
- **THEN** antwortet die API mit HTTP 401 und liefert keine Einträge

### Requirement: Einträge ohne Abteilung
Einträge ohne Abteilung MUST in der Einkaufsliste unter einer eigenen Überschrift „Sonstiges“ am Ende erscheinen und DÜRFEN NICHT optisch der ersten Abteilung zugeordnet werden.

#### Scenario: Freitext unter Sonstiges
- **WHEN** eine Liste die Abteilungen „Obst“ und „Gemüse“ sowie den Freitext „2 kg Zimt“ enthält
- **THEN** steht „2 kg Zimt“ unter der Überschrift „Sonstiges“ nach „Gemüse“
