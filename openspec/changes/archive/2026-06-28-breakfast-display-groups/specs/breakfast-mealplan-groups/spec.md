## ADDED Requirements

### Requirement: MealSlot gruppiert Frühstücks-Items nach Kategorie

Für Mahlzeiten mit `meal_type === 'breakfast'` SHALL der MealSlot die Items in Kategorien gruppieren, statt sie als einzelne Karten anzuzeigen.

Die Kategorisierung SHALL über `item.ingredient_tags` erfolgen:
- Tag `"breakfast-base"` → Kategorie "Brot"
- Tag `"breakfast-topping"` → Kategorie "Belag"
- Tag `"breakfast-warm-meal"` → Kategorie "Warme Gerichte"
- Tag `"breakfast-drink"` → Kategorie "Getränke"
- Kein passender Tag aber `recipe_id` → Abschnitt "Weitere" (Einzelkarten)
- Kein passender Tag und `ingredient_id` → Kategorie "Extras"

Items ohne Tag und ohne recipe_id/ingredient_id → Abschnitt "Weitere".

Jede Kategorie SHALL als Sub-Card mit leichtem Rand, abgerundeten Ecken und Kategorie-Header dargestellt werden.

#### Scenario: Brot-Items in Kategorie
- **WHEN** ein Item ingredient_tags=["breakfast-base"] hat
- **THEN** wird es in der Kategorie "Brot" angezeigt

#### Scenario: Gemischte Frühstücks-Items
- **WHEN** Brot, Belag und Getränke-Items vorhanden sind
- **THEN** werden sie in drei separaten Kategorie-Blöcken angezeigt

#### Scenario: Nicht-Frühstücks-Item
- **WHEN** ein Frühstücks-Slot ein manuell hinzugefügtes Rezept ohne breakfast-Tag enthält
- **THEN** wird es im Abschnitt "Weitere" als Einzelkarte angezeigt

### Requirement: QuantityInput ohne doppelten Wert

Für ingredient-Items im MealSlot SHALL der QuantityInput den Wert enthalten, und die Einheit + Gramm-Angabe SHALL als Label rechts neben dem Input stehen. Der Wert darf NICHT zweimal angezeigt werden.

Aktuelles Format (verboten):
`×0,56 Scheibe (28g) [×0,56]`

Neues Format (erforderlich):
`[×0,56] Scheibe (28g)`

#### Scenario: QuantityInput als einzige Wert-Anzeige
- **WHEN** ein ingredient-Item im MealSlot angezeigt wird
- **THEN** erscheint der Wert NUR im QuantityInput, nicht zusätzlich als Text

### Requirement: Kategorie-Summenzeilen (optional)

Jede Kategoriegruppe KANN eine optionale Summenzeile am Ende enthalten, die die Gesamtanzahl Portionen und kcal der Kategorie anzeigt.

#### Scenario: Summenzeile in Brot-Kategorie
- **WHEN** drei Brote mit zusammen 4,0 Scheiben
- **THEN** zeigt die Brot-Kategorie "Brote gesamt: 4,0 Scheiben · XX kcal"
