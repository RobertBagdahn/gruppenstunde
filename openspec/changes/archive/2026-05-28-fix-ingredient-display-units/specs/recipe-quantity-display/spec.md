## ADDED Requirements

### Requirement: Originaleinheit anzeigen

Zutaten auf der Rezept-Detailseite zeigen die Menge in der Einheit an, die im Editor gewählt wurde.

#### Scenario: Zutat mit nicht-Gewichtseinheit (Pr, TL, EL, Stück)
- **WHEN** ein RecipeItem `measuring_unit_name` hat das nicht in [g, gramm, kg, kilogramm, ml, milliliter, l, liter] ist
- **THEN** wird `"{quantity} {measuring_unit_name}"` angezeigt (z.B. "15 Pr", "2 TL")

#### Scenario: Zutat mit Gewichtseinheit
- **WHEN** ein RecipeItem `measuring_unit_name` in [g, gramm, kg, kilogramm, ml, milliliter, l, liter] hat
- **THEN** wird die Menge durch `formatQuantity` umgerechnet und smart angezeigt (z.B. "1,5 kg", "300 ml")

#### Scenario: Zutat ohne Einheit
- **WHEN** ein RecipeItem `measuring_unit_name` NULL ist und `quantity` = 0
- **THEN** wird nur der Zutat-Name angezeigt ohne Mengenangabe

### Requirement: Keine 0-Rundung

#### Scenario: Kleine Menge durch Skalierung
- **WHEN** eine Gramm-Menge nach Skalierung kleiner als 1 g aber größer als 0 ist
- **THEN** wird eine Kommazahl angezeigt (z.B. "0,3 g") statt auf "0 g" zu runden
