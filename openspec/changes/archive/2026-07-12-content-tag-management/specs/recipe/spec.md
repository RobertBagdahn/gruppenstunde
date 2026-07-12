## ADDED Requirements

### Requirement: Recipe preparation_method Feld

Das Recipe-Modell SHALL ein `preparation_method`-Feld (CharField, max_length=50, blank=True, choices) besitzen. Die verfügbaren Choices SHALL sein: cooking (Kochen), baking (Backen), frying (Braten), grilling (Grillen), raw (Rohkost), none (Keine Zubereitung).

#### Scenario: Preparation method in API response
- **WHEN** `GET /api/recipes/{id}/` aufgerufen wird
- **THEN** enthält die Response `preparation_method` mit dem gesetzten Wert oder `null`

#### Scenario: Preparation method setzen
- **WHEN** `POST /api/recipes/` mit `preparation_method: "baking"` aufgerufen wird
- **THEN** wird das Feld gespeichert und in der Response zurückgegeben

#### Scenario: Preparation method filter
- **WHEN** `GET /api/recipes/?preparation_method=baking` aufgerufen wird
- **THEN** werden nur Rezepte mit preparation_method="baking" zurückgegeben

### Requirement: Recipe equipment M2M

Das Recipe-Modell SHALL eine M2M-Relation `equipment` zum `supply.Equipment`-Modell besitzen. Ein Rezept KANN mehrere Equipment-Einträge haben.

#### Scenario: Equipment in API response
- **WHEN** `GET /api/recipes/{id}/` aufgerufen wird
- **THEN** enthält die Response `equipment: [{id, name, slug}, ...]`

#### Scenario: Equipment beim Erstellen setzen
- **WHEN** `POST /api/recipes/` mit `equipment_ids: [1, 3]` aufgerufen wird
- **THEN** werden die Equipment-Verknüpfungen gespeichert

#### Scenario: Equipment filter
- **WHEN** `GET /api/recipes/?equipment=oven` aufgerufen wird
- **THEN** werden nur Rezepte mit Equipment "oven" zurückgegeben
