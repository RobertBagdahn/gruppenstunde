## ADDED Requirements

### Requirement: RecipeItem.portion ist Pflicht

Jedes RecipeItem MUSS eine gültige Portion referenzieren. Die Portion bestimmt Zutat, Maßeinheit und Basisgewicht.

#### Scenario: Neues RecipeItem erstellen
- **WHEN** ein RecipeItem erstellt wird
- **THEN** muss `portion_id` gesetzt sein (nicht null), `quantity > 0`

#### Scenario: RecipeItem ohne portion_id speichern
- **WHEN** ein API-Request `portion_id=null` sendet
- **THEN** wird HTTP 422 zurückgegeben

### Requirement: RecipeItem hat kein eigenes ingredient/measuring_unit Feld

`ingredient` und `measuring_unit` werden über `portion.ingredient` und `portion.measuring_unit` aufgelöst.

#### Scenario: Zutat eines RecipeItems abfragen
- **WHEN** die API ein RecipeItem zurückgibt
- **THEN** enthält die Response `ingredient_name`, `ingredient_slug` (aufgelöst über `portion.ingredient`)

### Requirement: Portion.measuring_unit ist Pflicht

#### Scenario: Portion ohne measuring_unit speichern
- **WHEN** eine Portion ohne `measuring_unit` erstellt wird
- **THEN** wird ein Validierungsfehler ausgelöst

### Requirement: Portion.weight_g wird automatisch berechnet

#### Scenario: Portion mit Maßeinheit "g" speichern
- **WHEN** `measuring_unit.unit == "g"` und `quantity = 200`
- **THEN** `weight_g = 200 × measuring_unit.quantity`

#### Scenario: Portion mit Maßeinheit "ml" speichern
- **WHEN** `measuring_unit.unit == "ml"`, `quantity = 200`, `ingredient.physical_density = 1.03`
- **THEN** `weight_g = 200 × measuring_unit.quantity × 1.03`

#### Scenario: Portion mit Stück-Einheit speichern
- **WHEN** `measuring_unit.unit` ist weder "g" noch "ml"
- **THEN** `weight_g` bleibt unverändert (manuell/AI gesetzt)

### Requirement: Jede Ingredient hat eine Basis-Portion

#### Scenario: Ingredient ohne Basis-Portion
- **WHEN** eine Ingredient keine Portion mit `is_default=True` hat
- **THEN** wird automatisch eine erstellt: name="g" (bzw. "ml" für Flüssigkeiten), quantity=1, weight_g=1 (bzw. density)

### Requirement: quantity ist Multiplikator auf Portion

#### Scenario: Gesamtgewicht berechnen
- **WHEN** `quantity = 100` und `portion.weight_g = 1` (Basis-g-Portion)
- **THEN** Gesamtgewicht = 100g

#### Scenario: Portionsbasierte Menge
- **WHEN** `quantity = 2` und `portion.weight_g = 500` (Packung)
- **THEN** Gesamtgewicht = 1000g

### Requirement: RecipeItem.quantity muss positiv sein

#### Scenario: quantity = 0 oder negativ
- **WHEN** `quantity <= 0`
- **THEN** DB-CheckConstraint verhindert das Speichern
