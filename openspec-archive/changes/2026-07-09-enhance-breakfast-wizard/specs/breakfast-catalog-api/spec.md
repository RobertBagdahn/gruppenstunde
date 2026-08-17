## MODIFIED Requirements

### Requirement: Breakfast catalog includes extras
Das Breakfast-Catalog-Response enthält jetzt ein neues Feld `extra_ingredients` mit Extras (Ingredients mit Tag `breakfast-extra`).

**Original Requirement**: 
```
GET /api/supply/breakfast-catalog/
Response: { base_ingredients, topping_ingredients, fat_ingredients, drink_ingredients, drink_recipes, warm_meal_recipes }
```

**Modified to**:
```
GET /api/supply/breakfast-catalog/
Response: { base_ingredients, topping_ingredients, fat_ingredients, drink_ingredients, drink_recipes, warm_meal_recipes, extra_ingredients }
```

#### Scenario: Breakfast catalog returns extras
- **WHEN** user ruft `GET /api/supply/breakfast-catalog/` auf
- **THEN** Response enthält neues Feld: `extra_ingredients`
- **AND** `extra_ingredients` ist ein Array von Ingredient-Objekten
- **AND** Alle Items in `extra_ingredients` haben Tag `breakfast-extra`

### Requirement: Breakfast catalog filters by user permissions
Das Breakfast-Catalog zeigt nur Zutaten/Rezepte, die der User sehen darf (permission-based filtering).

**Original Requirement**: 
```
GET /api/supply/breakfast-catalog/
→ Zeigt alle System-Zutaten (status=approved)
```

**Modified to**:
```
GET /api/supply/breakfast-catalog/?group_id=<group_id>
→ Zeigt:
   - System-Zutaten (owner=null, status=approved)
   - User's eigene Zutaten (owner=user)
   - Zutaten geteilte mit der Gruppe (visibility=shared, shared_groups contains group)
   - Rezepte nach gleicher Logik

Unauthenticated requests:
   - Zeigen nur System-Items (owner=null, status=approved)
```

#### Scenario: Authenticated request with group filter
- **WHEN** authenticated user ruft `GET /api/supply/breakfast-catalog/?group_id=123` auf
- **THEN** Response enthält: System-Items + User's Items + geteilte Items
- **AND** Private Items anderer Users sind NOT sichtbar

#### Scenario: Unauthenticated request
- **WHEN** nicht-angemeldeter User ruft `GET /api/supply/breakfast-catalog/` auf
- **THEN** Response enthält nur: System-Items (owner=null)
- **AND** Keine User-Items oder geteilten Items

### Requirement: Breakfast catalog accepts optional group_id parameter
Der Catalog kann optional mit `group_id` Query-Parameter gefiltert werden.

#### Scenario: Group filtering
- **WHEN** user ruft `GET /api/supply/breakfast-catalog/?group_id=wölflinge` auf
- **THEN** Response filtert nach Items für die Gruppe "wölflinge"
- **AND** Wenn group_id nicht gesetzt: System versucht User's primary group zu nutzen (oder zeigt Error wenn not authenticated)

### Requirement: Breakfast catalog response schema includes owner info
Jedes Item im Catalog-Response enthält Informationen über den Owner (falls nicht System).

**Original**: Ingredient { name, slug, ... } (Owner nicht sichtbar)

**Modified to**: Ingredient { ..., owner: { id, name }, created_by: string, status: "draft" | "approved" } (falls owner gesetzt)

#### Scenario: Ingredient with owner info
- **WHEN** user sieht Ingredient "Glutenfreies Brot" im Catalog
- **THEN** Item enthält: owner={ id: 123, name: "Robert" }
- **AND** Frontend kann anzeigen: "Von Robert" oder ähnlich

### Requirement: Performance optimization for catalog queries
Catalog-Queries sind performant mit Indexes auf tag, owner, visibility, shared_groups.

#### Scenario: Fast catalog loading
- **WHEN** user öffnet Breakfast-Wizard
- **THEN** Catalog lädt in < 300ms
- **AND** Queries sind indexed (tag__name, owner_id, visibility, shared_groups)
