## MODIFIED Requirements

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
