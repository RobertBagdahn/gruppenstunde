## ADDED Requirements

### Requirement: Sortierung im Ingredient-List-Endpoint
Der Endpoint `GET /api/ingredients/` SHALL einen optionalen `ordering`-Query-Parameter akzeptieren.

#### Scenario: Sortierung nach Preis aufsteigend
- **WHEN** `?ordering=price_asc` übergeben wird
- **THEN** SHALL die Ergebnisse nach `price_per_kg` aufsteigend sortiert sein, Zutaten ohne Preis (NULL) ans Ende

#### Scenario: Sortierung nach Preis absteigend
- **WHEN** `?ordering=price_desc` übergeben wird
- **THEN** SHALL die Ergebnisse nach `price_per_kg` absteigend sortiert sein

#### Scenario: Sortierung nach Nutriscore
- **WHEN** `?ordering=nutri_class_asc` übergeben wird
- **THEN** SHALL die Ergebnisse nach `nutri_class` aufsteigend sortiert sein (1=A zuerst), NULLs ans Ende

#### Scenario: Sortierung nach Kalorien
- **WHEN** `?ordering=energy_kcal_asc` übergeben wird
- **THEN** SHALL die Ergebnisse nach `energy_kcal` aufsteigend sortiert sein, NULLs ans Ende

#### Scenario: Standard ohne ordering-Parameter
- **WHEN** kein `ordering`-Parameter übergeben wird
- **THEN** SHALL die Default-Sortierung des Models verwendet werden (unverändert)

### Requirement: Filter nach Nutritional-Tag im Ingredient-List-Endpoint
Der Endpoint `GET /api/ingredients/` SHALL einen optionalen `nutritional_tag`-Query-Parameter (Integer) akzeptieren, der Zutaten auf solche filtert, die den angegebenen Tag besitzen.

#### Scenario: Filter nach einem Tag
- **WHEN** `?nutritional_tag=5` übergeben wird
- **THEN** SHALL nur Zutaten zurückgegeben werden, die den Nutritional-Tag mit `id=5` in ihrer `nutritional_tags`-ManyToMany-Beziehung haben

#### Scenario: Kein Tag-Filter
- **WHEN** kein `nutritional_tag`-Parameter übergeben wird
- **THEN** SHALL keine Tag-Filterung angewendet werden

#### Scenario: Kombination mit anderen Filtern
- **WHEN** `?name=hafer&nutritional_tag=5&ordering=price_asc` übergeben wird
- **THEN** SHALL alle Filter kombiniert angewendet werden (AND-Logik)

### Requirement: quality_score im Ingredient-List-Schema (Frontend)
Das Zod-Schema `IngredientListItemSchema` in `frontend-food/src/schemas/supply.ts` SHALL das Feld `quality_score` als `z.number().int().nullable()` enthalten, da der Backend-Endpoint es bereits sendet.

#### Scenario: quality_score im API-Response
- **WHEN** `GET /api/ingredients/` aufgerufen wird
- **THEN** SHALL jedes Item in der Antwort ein `quality_score`-Feld (int oder null) enthalten
- **THEN** SHALL das Frontend dieses Feld nicht mehr still verwerfen
