## MODIFIED Requirements

### Requirement: display_quantity mit Packungsoptionen
Das `display_quantity`-Feld auf `ShoppingListItemOut` MUST erweitert werden um Packungsoptionen, sofern solche für das verknüpfte Ingredient definiert sind. Das Format ist `"{gramm} · {n}×{packung1} · {m}×{packung2}"`.

#### Scenario: display_quantity ohne Packungen
- **WHEN** das Ingredient keine Packungsportionen hat
- **THEN** MUST `display_quantity` nur den Gramm-Wert enthalten (wie bisher): `"750g"`

#### Scenario: display_quantity mit einer Packungsgröße
- **WHEN** das Ingredient eine Packungsportion hat (z.B. 250g Packung)
- **THEN** MUST `display_quantity` das erweiterte Format enthalten: `"750g · 3×250g"`

#### Scenario: display_quantity mit mehreren Packungsgrößen
- **WHEN** das Ingredient mehrere Packungsportionen hat (z.B. 250g und 500g)
- **THEN** MUST `display_quantity` alle Optionen enthalten: `"750g · 3×250g · 2×500g"`

#### Scenario: Bestehende Felder bleiben erhalten
- **WHEN** die API aufgerufen wird
- **THEN** MUST `natural_portions`, `portion_options` und alle anderen bisherigen Felder unverändert erhalten bleiben (kein Breaking Change)
