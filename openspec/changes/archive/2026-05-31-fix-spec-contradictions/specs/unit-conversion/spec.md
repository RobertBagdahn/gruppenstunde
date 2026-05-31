## MODIFIED Requirements

### Requirement: Backend resolve_measuring_unit_name über Portion

Die Funktion `resolve_measuring_unit_name` löst den Einheitsnamen für ein RecipeItem auf. Der Pfad ist immer `RecipeItem.portion.measuring_unit.name`. RecipeItem hat kein direktes `measuring_unit`-Feld — die Einheit kommt ausschließlich über die Portion-Beziehung.

#### Scenario: RecipeItem mit Portion die MeasuringUnit hat
- **WHEN** ein RecipeItem eine `portion` hat und diese Portion eine `measuring_unit` zugeordnet hat
- **THEN** gibt `resolve_measuring_unit_name` den `measuring_unit.name` der Portion zurück

#### Scenario: RecipeItem mit Portion ohne MeasuringUnit
- **WHEN** ein RecipeItem eine `portion` hat aber diese Portion keine `measuring_unit` hat
- **THEN** gibt `resolve_measuring_unit_name` NULL zurück
