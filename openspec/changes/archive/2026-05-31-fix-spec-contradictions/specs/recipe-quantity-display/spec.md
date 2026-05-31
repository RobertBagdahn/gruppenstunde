## MODIFIED Requirements

### Requirement: Originaleinheit anzeigen

Zutaten auf der Rezept-Detailseite zeigen die Menge in der Einheit an, die im Editor gewählt wurde. Die Einheit wird über den Pfad `RecipeItem.portion.measuring_unit` aufgelöst (RecipeItem hat kein direktes `measuring_unit`-Feld).

#### Scenario: Zutat mit nicht-Gewichtseinheit (Pr, TL, EL, Stück)
- **WHEN** ein RecipeItem eine Portion hat deren `measuring_unit.name` nicht in [g, gramm, kg, kilogramm, ml, milliliter, l, liter] ist
- **THEN** wird `"{quantity} {portion.measuring_unit.name}"` angezeigt (z.B. "15 Pr", "2 TL")

#### Scenario: Zutat mit Gewichtseinheit
- **WHEN** ein RecipeItem eine Portion hat deren `measuring_unit.name` in [g, gramm, kg, kilogramm, ml, milliliter, l, liter] ist
- **THEN** wird die Menge durch `formatQuantity` umgerechnet und smart angezeigt (z.B. "1,5 kg", "300 ml")

#### Scenario: Zutat ohne Einheit und Menge 0
- **WHEN** ein RecipeItem eine Portion ohne `measuring_unit` hat und `quantity` = 0
- **THEN** wird nur der Zutat-Name angezeigt ohne Mengenangabe
