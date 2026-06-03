## MODIFIED Requirements

### Requirement: Recipe Items with Quantity and Unit
The system SHALL create RecipeItem associations with correct `portion_id`, quantity, and optional note for each ingredient. The Import-Service SHALL resolve or create the appropriate Portion during import, not at save time. Portion-Erzeugung MUSS die zentrale `Portion`-Logik verwenden: Einheiten MÜSSEN auf kanonische `MeasuringUnit` gemappt werden (kein `get_or_create(name=...)`), Portionen MÜSSEN pro `(ingredient, name, measuring_unit, quantity)` dedupliziert werden, und `weight_g` MUSS über die zentrale Berechnung gesetzt werden, wenn Gemini keinen gültigen Wert liefert.

#### Scenario: Portion exists for ingredient + measuring_unit
- **WHEN** eine Portion für die Kombination (ingredient_id, measuring_unit_id) in der DB existiert
- **THEN** SHALL der Import-Service diese `portion_id` im Draft-Response zurückgeben

#### Scenario: Portion does not exist — created with estimated weight_g
- **WHEN** keine Portion für die Kombination (ingredient_id, measuring_unit_id) existiert
- **THEN** SHALL der Import-Service eine neue Portion erstellen mit `weight_g` aus Geminis `estimated_portion_weight_g`, sofern dieser `> 0` ist
- **THEN** wenn Gemini keinen gültigen `weight_g` liefert, MUSS der Wert über die zentrale Berechnung (`quantity × measuring_unit.quantity`) gesetzt werden
- **THEN** die neue `portion_id` SHALL im Draft-Response enthalten sein

#### Scenario: Einheit wird kanonisiert statt dupliziert
- **WHEN** Gemini einen Einheitennamen liefert (z. B. „g", „EL"), der einer kanonischen `MeasuringUnit` (per Name oder Alias) entspricht
- **THEN** MUSS die Portion die kanonische `MeasuringUnit` referenzieren
- **THEN** DARF KEINE neue Dubletten-Einheit per `MeasuringUnit.objects.get_or_create(name=...)` angelegt werden

#### Scenario: Neue Zutat erzeugt keine Duplikat-Portion
- **WHEN** beim Anlegen einer neuen Zutat eine Default-Portion erstellt wird, die mit `(ingredient, name, measuring_unit, quantity)` bereits existiert
- **THEN** MUSS die bestehende Portion wiederverwendet werden (`get_or_create`) statt eine neue zu erstellen

#### Scenario: Frontend sends portion_id when saving
- **WHEN** der User das Rezept speichert
- **THEN** SHALL das Frontend `portion_id` (nicht `ingredient_id`) an `POST /api/recipes/{id}/recipe-items/` senden
