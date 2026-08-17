## ADDED Requirements

### Requirement: Einmalige KI-Portionsnormierung der Seed-Daten
Ein Admin kann per Management Command alle Rezepte einmalig auf realistische 1-Personen-Mengen korrigieren lassen.

#### Scenario: Dry-Run zeigt Vorher/Nachher
- **WHEN** `normalize_recipe_portions --dry-run` ausgeführt wird
- **THEN** wird eine Tabelle mit alten und neuen Mengen pro Zutat ausgegeben, DB bleibt unverändert

#### Scenario: Normierung wird angewendet
- **WHEN** `normalize_recipe_portions` ohne dry-run ausgeführt wird
- **THEN** werden alle RecipeItem.quantity-Werte aktualisiert und der Nährwert-Cache neu berechnet

#### Scenario: Structured Output Matching per Index
- **WHEN** die KI antwortet
- **THEN** wird jedes Item per Index dem korrespondierenden RecipeItem zugeordnet
