## MODIFIED Requirements

### Requirement: Recipe Model inherits from Content
Recipe SHALL inherit from the abstract `Content` base class instead of defining its own base fields. All existing Recipe-specific fields (recipe_type, servings) SHALL be preserved. Duplicated fields (title, slug, summary, description, difficulty, costs_rating, execution_time, status, image, created_at, updated_at) SHALL come from Content. The `servings` field SHALL default to 1 (Normportion) and represent the base portion count for which all RecipeItem quantities are stored.

#### Scenario: Recipe has all Content fields
- **WHEN** a Recipe is created
- **THEN** it SHALL have all Content base fields (title, slug, summary, description, tags, scout_levels, authors, embedding, etc.)
- **THEN** it SHALL also have recipe-specific fields (recipe_type, servings)
- **THEN** servings SHALL default to 1

### Requirement: RecipeItem uses Supply-based Ingredient
RecipeItem SHALL reference `supply.Ingredient` and `supply.Portion` instead of `idea.Ingredient` and `idea.Portion`. The cross-app FK pattern SHALL remain the same.

#### Scenario: RecipeItem references supply.Ingredient
- **WHEN** a RecipeItem is created
- **THEN** it SHALL reference a Portion from the supply app
- **THEN** quantities SHALL be per NormPerson (1 Portion)

## ADDED Requirements

### Requirement: Portionsrechner-Daten in Recipe-API
Die Recipe-Detail-API SHALL zusätzliche Daten für den Portionsrechner liefern, einschließlich aller verfügbaren Portionen pro Zutat.

#### Scenario: Recipe-Detail enthält Portions-Informationen
- **WHEN** ein Nutzer `GET /api/recipes/{id}/` oder `GET /api/recipes/by-slug/{slug}/` aufruft
- **THEN** SHALL jedes RecipeItem im Response zusätzlich `ingredient_portions` enthalten: eine Liste aller Portionen der Zutat mit `name`, `weight_g`, `priority`, `is_default`
- **THEN** SHALL jedes RecipeItem `ingredient_density` und `ingredient_viscosity` enthalten

### Requirement: Export-Button auf Rezeptdetailseite
Die Rezeptdetailseite SHALL einen "Zur Einkaufsliste hinzufügen"-Button anzeigen.

#### Scenario: Einkaufsliste aus Rezept erstellen
- **WHEN** ein authentifizierter Nutzer auf der Rezeptdetailseite "Zur Einkaufsliste" klickt
- **THEN** SHALL ein Dialog erscheinen mit der aktuellen Portionszahl aus dem Skalierungsrechner
- **THEN** SHALL der Nutzer die Portionszahl anpassen können
- **THEN** SHALL nach Bestätigung die Shopping-List-API aufgerufen werden
- **THEN** SHALL der Nutzer zur erstellten Einkaufsliste weitergeleitet werden
