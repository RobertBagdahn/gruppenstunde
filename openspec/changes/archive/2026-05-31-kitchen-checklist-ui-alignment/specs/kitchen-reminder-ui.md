## ADDED Requirements

### Requirement: Kitchen reminder items match shopping list item style
Küchenbedarf-Erinnerungs-Items verwenden denselben Checkbox-Style wie ShoppingListItemRow.

#### Scenario: User sieht Reminder-Items
- **WHEN** die KitchenReminderSection gerendert wird
- **THEN** haben alle Items einen 44x44px touch-freundlichen Checkbox-Button (identisch zu ShoppingListItemRow)

### Requirement: "Bereits vorhanden" Button
Jedes Reminder-Item hat rechts einen Button zum Markieren als "bereits vorhanden".

#### Scenario: User markiert Item als vorhanden
- **WHEN** der User auf "Bereits vorhanden" klickt
- **THEN** wird das Item visuell als vorhanden markiert (grüner Badge/Indikator)
- **THEN** bleibt der Status lokal (kein Server-Request)
