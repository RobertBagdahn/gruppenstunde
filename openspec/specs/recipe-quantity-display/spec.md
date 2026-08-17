## Purpose

Skalierte und präzise Mengenanzeige in Rezeptansichten.

## Requirements

### Requirement: Korrekte Mengenskalierung pro Portion

Das System SHALL `RecipeItem.quantity` als Pro-1-Person-Menge behandeln. Die angezeigte Menge für N Portionen SHALL `quantity × N` sein.

#### Scenario: Anzeige für 1 Portion
- **WHEN** ein Rezept mit `quantity=3.75` und `measuring_unit=g` angezeigt wird bei 1 Portion
- **THEN** wird `3.75g` berechnet und gemäß smartRound auf `4 g` aufgerundet

#### Scenario: Anzeige für 4 Portionen
- **WHEN** dasselbe Rezept bei 4 Portionen angezeigt wird
- **THEN** wird `3.75 × 4 = 15g` berechnet und als `15 g` angezeigt

### Requirement: Keine Null-Anzeige bei positiven Werten

Das System SHALL niemals "0 g" oder "0 ml" anzeigen, wenn der tatsächliche Wert größer als 0 ist. Der Minimalwert SHALL auf die kleinste sinnvolle Einheit aufgerundet werden.

#### Scenario: Sehr kleine Grammwerte
- **WHEN** ein berechneter Wert von 0.3g formatiert wird
- **THEN** wird "300 mg" angezeigt, nicht "0 g"

#### Scenario: Exakt null
- **WHEN** ein berechneter Wert von exakt 0g formatiert wird
- **THEN** wird "0 g" angezeigt (korrekt, da tatsächlich 0)

### Requirement: Originaleinheit anzeigen

Zutaten auf der Rezept-Detailseite SHALL die Menge in der Einheit anzeigen, die im Editor gewählt wurde. Die Einheit wird über den Pfad `RecipeItem.portion.measuring_unit` aufgelöst (RecipeItem hat kein direktes `measuring_unit`-Feld).

#### Scenario: Zutat mit nicht-Gewichtseinheit (Pr, TL, EL, Stück)
- **WHEN** ein RecipeItem eine Portion hat deren `measuring_unit.name` nicht in [g, gramm, kg, kilogramm, ml, milliliter, l, liter] ist
- **THEN** wird `"{quantity} {portion.measuring_unit.name}"` angezeigt (z.B. "15 Pr", "2 TL")

#### Scenario: Zutat mit Gewichtseinheit
- **WHEN** ein RecipeItem eine Portion hat deren `measuring_unit.name` in [g, gramm, kg, kilogramm, ml, milliliter, l, liter] ist
- **THEN** wird die Menge durch `formatQuantity` umgerechnet und smart angezeigt (z.B. "1,5 kg", "300 ml")

#### Scenario: Zutat ohne Einheit und Menge 0
- **WHEN** ein RecipeItem eine Portion ohne `measuring_unit` hat und `quantity` = 0
- **THEN** wird nur der Zutat-Name angezeigt ohne Mengenangabe

### Requirement: Zutatenanzeige in Rezeptansicht
Die Rezeptansicht (Detail- und Bearbeitungsansicht) MUST das neue `portion_display`-Feld aus der API verwenden, um Zutatmengen anzuzeigen. Das kombinierte Format `"{quantity} {unit} {ingredient} ({weight})"` ersetzt die bisherige getrennte Darstellung.

#### Scenario: Anzeige mit portion_display
- **WHEN** die API `portion_display = "3,4 Äpfel (969g)"` liefert
- **THEN** MUST die Rezeptansicht diesen String unverändert anzeigen

#### Scenario: Fallback wenn portion_display fehlt
- **WHEN** `portion_display` nicht im API-Response enthalten ist (ältere API-Version)
- **THEN** SHOULD das Frontend die bisherige Darstellung als Fallback verwenden

#### Scenario: Warnung bei fehlenden Gewichtsdaten
- **WHEN** `has_missing_weight == true`
- **THEN** MUST die Zutatzeile in der Rezeptansicht orange markiert sein (Warnfarbe oder Icon)

#### Scenario: Bearbeitungsansicht
- **WHEN** der Nutzer ein Rezept bearbeitet (EditRecipePage)
- **THEN** MUST `portion_display` auch im Edit-Modus als Vorschau neben dem Input-Feld angezeigt werden
