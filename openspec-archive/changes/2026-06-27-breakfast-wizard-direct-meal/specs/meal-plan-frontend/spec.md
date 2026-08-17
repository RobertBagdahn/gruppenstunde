## ADDED Requirements

### Requirement: Frühstücksassistent-Button im MealSlot

Der MealSlot-Component SHALL für Frühstück-Mahlzeiten (`meal.meal_type === 'breakfast'`) einen "Frühstücksassistent"-Button anzeigen, der den Wizard im DirectMeal-Mode öffnet. Der Button SHALL nur sichtbar sein, wenn `canEdit` true ist und das Meal kein externes Meal ist (`!meal.is_external`).

#### Scenario: Button im leeren Frühstück-Slot
- **WHEN** ein MealSlot für Frühstück keine Items hat, `canEdit` true und `is_external` false
- **THEN** wird der "Frühstücksassistent"-Button prominent unter dem existierenden "Rezept oder Zutat wählen"-Button angezeigt
- **AND** der Button zeigt ein Wizard-Icon und den Text "Frühstücksassistent"

#### Scenario: Button im Frühstück-Slot mit Items
- **WHEN** ein MealSlot für Frühstück bereits Items hat, `canEdit` true und `is_external` false
- **THEN** wird ein kompakter "Frühstücksassistent"-Button in der Header-Zeile des MealSlots angezeigt (neben dem Meal-Typ-Label)

#### Scenario: Button nicht im Nicht-Frühstück-Slot
- **WHEN** ein MealSlot für Mittagessen, Abendessen oder Snack angezeigt wird
- **THEN** wird der "Frühstücksassistent"-Button NICHT angezeigt

#### Scenario: Button nicht bei fehlender Edit-Berechtigung
- **WHEN** `canEdit` ist `false`
- **THEN** wird der "Frühstücksassistent"-Button NICHT angezeigt

#### Scenario: Button nicht bei externem Meal
- **WHEN** `meal.is_external` ist `true`
- **THEN** wird der "Frühstücksassistent"-Button NICHT angezeigt

#### Scenario: Button nicht bei verknüpftem Meal
- **WHEN** `meal.is_synced` ist `true` (Meal ist mit einem RefMeal verknüpft)
- **THEN** wird der "Frühstücksassistent"-Button NICHT angezeigt

#### Scenario: Klick auf Button im leeren Slot
- **WHEN** der Nutzer auf "Frühstücksassistent" in einem leeren Frühstück-Slot klickt
- **THEN** navigiert die App direkt zu `/meal-plans/{planId}/meals/{mealId}/breakfast-wizard`

#### Scenario: Klick auf Button im Slot mit Items
- **WHEN** der Nutzer auf "Frühstücksassistent" in einem Frühstück-Slot mit bestehenden Items klickt
- **THEN** öffnet zuerst der Überschreib-Warn-Dialog
- **AND** erst nach Bestätigung navigiert die App zum Wizard
