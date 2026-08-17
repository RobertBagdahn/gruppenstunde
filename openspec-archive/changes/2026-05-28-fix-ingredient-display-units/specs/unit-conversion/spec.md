## ADDED Requirements

### Requirement: formatQuantity darf nicht auf 0 runden

#### Scenario: Eingabewert > 0
- **WHEN** `formatQuantity` mit einem Wert > 0 aufgerufen wird
- **THEN** darf das Ergebnis niemals "0 g" oder "0 ml" sein — mindestens eine Nachkommastelle wird angezeigt

### Requirement: Backend resolve_measuring_unit_name ohne Portion-Fallback

#### Scenario: RecipeItem ohne direkte measuring_unit
- **WHEN** ein RecipeItem keine direkte `measuring_unit` hat (nur eine `portion`)
- **THEN** gibt `resolve_measuring_unit_name` NULL zurück (nicht die `portion.measuring_unit.name`)
