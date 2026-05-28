## ADDED Requirements

### Requirement: Korrekte Mengenskalierung pro Portion

Das System MUSS `RecipeItem.quantity` als Pro-1-Person-Menge behandeln. Die angezeigte Menge für N Portionen MUSS `quantity × N` sein.

#### Scenario: Anzeige für 1 Portion
- **WHEN** ein Rezept mit `quantity=3.75` und `measuring_unit=g` angezeigt wird bei 1 Portion
- **THEN** wird `3.75g` berechnet und gemäß smartRound auf `4 g` aufgerundet

#### Scenario: Anzeige für 4 Portionen
- **WHEN** dasselbe Rezept bei 4 Portionen angezeigt wird
- **THEN** wird `3.75 × 4 = 15g` berechnet und als `15 g` angezeigt

### Requirement: Keine Null-Anzeige bei positiven Werten

Das System DARF NIEMALS "0 g" oder "0 ml" anzeigen wenn der tatsächliche Wert größer als 0 ist. Der Minimalwert MUSS auf die kleinste sinnvolle Einheit aufgerundet werden.

#### Scenario: Sehr kleine Grammwerte
- **WHEN** ein berechneter Wert von 0.3g formatiert wird
- **THEN** wird mindestens "0,3 g" angezeigt (aufgerundet auf 0.1er-Schritt), nicht "0 g"

#### Scenario: Exakt null
- **WHEN** ein berechneter Wert von exakt 0g formatiert wird
- **THEN** wird "0 g" angezeigt (korrekt, da tatsächlich 0)
