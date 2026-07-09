## MODIFIED Requirements

### Requirement: Packungsoptionen in Einkaufslisten-Zeile

Das Backend SHALL für jeden `ShoppingListItem` mit einem verknüpften `Ingredient` die kleinste sinnvolle Packungsgröße berechnen und in `display_quantity` anhängen. Die Packungsgröße wird anhand der Portion mit dem kleinsten `weight_g > 0` ermittelt, die nicht die Gramm-Basiseinheit ist (kein `measuring_unit.unit="g"` mit `quantity <= 1`). Besitzt diese Portion einen aussagekräftigen Namen (ungleich generischer Gewichtsbezeichnung, z.B. „Scheibe", „Packung", „Stück"), SHALL dieser Name statt einer reinen Gewichtsangabe verwendet werden.

#### Scenario: Ein Ingredient mit mehreren Portionen — kleinste Packung verwendet

- **WHEN** ein `ShoppingListItem` hat `quantity_g=750`, `ingredient` hat Portionen `"125g" (weight_g=125)`, `"Stück" (weight_g=180)`, `"Packung" (weight_g=500)`
- **THEN** MUST `display_quantity` den String `"750g · 6×125g"` enthalten (kleinste nicht-g Portion)

#### Scenario: Nur eine nicht-g Portion vorhanden

- **WHEN** ein `ShoppingListItem` hat `quantity_g=750`, `ingredient` hat Portionen `"Packung" (weight_g=250)` und `"g"`
- **THEN** MUST `display_quantity` den String `"750g · 3×250g"` enthalten

#### Scenario: Benannte Portion wird bevorzugt dargestellt

- **WHEN** ein `ShoppingListItem` hat `quantity_g=170`, `ingredient` hat eine Portion `"Scheibe"` mit `weight_g=50`
- **THEN** MUST `display_quantity` den String `"170g · ≈ 3,4 Scheiben"` enthalten (benannte Portion statt generischer „N×50g"-Zählung)

#### Scenario: Kein geeignete Portion vorhanden

- **WHEN** ein `ShoppingListItem` hat keinen Ingredient oder der Ingredient hat keine Portion mit `weight_g > 0` außer der g-Einheit
- **THEN** MUST `display_quantity` nur die Gramm-Menge enthalten, ohne ` · ` Erweiterung

#### Scenario: Packungsmenge geht nicht genau auf — aufrunden

- **WHEN** `quantity_g=700`, kleinste Packung `weight_g=250` → exakt 2,8 Packungen
- **THEN** MUST auf 3 aufgerundet werden: `display = "3×250g"`

#### Scenario: Packungsmenge geht nicht auf — Rest unter 10% Schwelle → abrunden

- **WHEN** `quantity_g=995`, kleinste Packung `weight_g=500` → exakt 1,99 Packungen, Rest = 5g = 0,5% von 995g
- **THEN** MUST auf 2 abgerundet werden (Rest < 10%): `display = "2×500g"`

#### Scenario: Reserve-Faktor bereits in quantity_g eingerechnet

- **WHEN** `ShoppingListItem.quantity_g` enthält bereits den skalierten Wert inkl. `reserve_factor`
- **THEN** MUST die Packungsberechnung direkt auf diesem Wert arbeiten, ohne weiteren Aufschlag
