## ADDED Requirements

### Requirement: Food-Fixtures enthalten Packages vollständig
Der Produktionsdaten-Export und -Import MUST Ingredients, Portionen, Packages, RecipeItems und ihre Foreign-Key-Beziehungen vollständig und in sicherer Reihenfolge verarbeiten.

#### Scenario: Export eines Ingredients mit Package
- **WHEN** ein Ingredient mit Portionen und Packages exportiert wird
- **THEN** enthalten die Food-Fixtures alle Datensätze mit stabilen Primärschlüsseln und referenzierbaren Foreign Keys

#### Scenario: Import in leerer Datenbank
- **WHEN** ein vollständiger Food-Import ausgeführt wird
- **THEN** werden Packages nach ihrem Ingredient und vor abhängigen RecipeItems geladen

#### Scenario: Idempotenter Wiederholungsimport
- **WHEN** dieselben Food-Fixtures zweimal importiert werden
- **THEN** entstehen keine unkontrollierten Duplikate und bestehende Beziehungen bleiben gültig

### Requirement: Export und Import werden als Roundtrip geprüft
Der Datenworkflow MUST einen automatisierten Test für einen repräsentativen Food-Roundtrip bereitstellen.

#### Scenario: Roundtrip mit RecipeItem
- **WHEN** ein Ingredient mit Portion, Package, Rezept und RecipeItem exportiert und importiert wird
- **THEN** stimmen die fachlich relevanten Felder und alle Beziehungen mit dem Ausgangsbestand überein
