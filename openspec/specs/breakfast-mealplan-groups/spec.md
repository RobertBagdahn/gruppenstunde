# Breakfast MealPlan Groups

## Purpose
Gruppierte Darstellung von Mahlzeit-Einträgen im MealSlot.
## Requirements
### Requirement: MealSlot gruppiert Frühstücks-Items nach Kategorie

Für Mahlzeiten jedes Typs, die mindestens einen Eintrag mit gesetztem `buffet_role` oder einen Eintrag mit Buffet-Rollen-Tag enthalten, SHALL der MealSlot die Items nach Buffet-Rolle gruppieren, statt sie als einzelne Karten anzuzeigen.

Die Kategorisierung SHALL in dieser Reihenfolge erfolgen:
1. `item.buffet_role` (vom Buffet-Builder gesetzt), sonst
2. der erste Rollen-Tag in `item.ingredient_tags` bzw. den Tags des Rezepts (Reihenfolge der Rollen gemäß `sort_order` der Tags).

Die Kategorie-Überschrift SHALL der deutsche Name der Rolle sein („Brot & Gebäck“, „Streichfett“, „Belag herzhaft“, „Belag süß“, „Soßen & Würze“, „Gemüse & Obst“, „Müsli & Joghurt“, „Getränke“, „Gerichte“). Items ohne Rolle SHALL im Abschnitt „Weitere“ als Einzelkarten erscheinen.

Jede Kategorie SHALL als Sub-Card mit leichtem Rand, abgerundeten Ecken und Kategorie-Header dargestellt werden.

#### Scenario: Brot-Items in Kategorie
- **WHEN** ein Item `buffet_role="buffet-bread"` hat
- **THEN** wird es in der Kategorie „Brot & Gebäck“ angezeigt

#### Scenario: Gemischte Buffet-Items
- **WHEN** Brot-, Belag- und Getränke-Items vorhanden sind
- **THEN** werden sie in separaten Kategorie-Blöcken in Rollen-Reihenfolge angezeigt

#### Scenario: Baguette-Mittagessen
- **WHEN** ein Mittagessen mit der Vorlage „Belegte Baguettes“ gespeichert wurde
- **THEN** werden die Items ebenfalls nach Rollen gruppiert

#### Scenario: Item ohne Rolle
- **WHEN** eine Buffet-Mahlzeit ein manuell hinzugefügtes Rezept ohne Rollen-Tag enthält
- **THEN** wird es im Abschnitt „Weitere“ als Einzelkarte angezeigt

#### Scenario: Gemischte Frühstücks-Items
- **WHEN** Brot, Belag und Getränke-Items vorhanden sind
- **THEN** werden sie in separaten Kategorie-Blöcken angezeigt (Nachfolger von „Gemischte Buffet-Items“, gilt jetzt für jeden Mahlzeitentyp)

#### Scenario: Nicht-Frühstücks-Item
- **WHEN** ein Slot ein manuell hinzugefügtes Rezept ohne breakfast-Tag enthält
- **THEN** wird es im Abschnitt „Weitere“ als Einzelkarte angezeigt (Nachfolger von „Item ohne Rolle“)

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

Eine Kategoriegruppe SHALL optional eine Summenzeile am Ende zeigen dürfen, die die Gesamtanzahl Portionen und kcal der Kategorie anzeigt.

#### Scenario: Summenzeile in Brot-Kategorie
- **WHEN** drei Brote mit zusammen 4,0 Scheiben
- **THEN** zeigt die Brot-Kategorie "Brote gesamt: 4,0 Scheiben · XX kcal"
