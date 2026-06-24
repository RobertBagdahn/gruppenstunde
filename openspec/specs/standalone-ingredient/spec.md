### Requirement: Ingredient standalone flag
The system SHALL allow marking an Ingredient as standalone food via `is_standalone_food` boolean field (default: False).

#### Scenario: Ingredient marked as standalone
- **WHEN** an Ingredient has `is_standalone_food=True`
- **THEN** it SHALL be available for direct selection in the meal plan search

#### Scenario: Ingredient not marked as standalone
- **WHEN** an Ingredient has `is_standalone_food=False`
- **THEN** it SHALL NOT appear in meal plan search results

### Requirement: Standalone ingredients searchable by nutritional tags
The system SHALL filter standalone Ingredients by `nutritional_tags` when `nutritional_tag_ids` are provided in the search.

#### Scenario: Filter by vegan tag
- **WHEN** user searches with `nutritional_tag_ids=5` (vegan)
- **THEN** only standalone Ingredients that have ALL specified nutritional tags SHALL be returned

### Requirement: Roh verzehrbare Zutaten direkt als MealItem
Das System SHALL es ermöglichen, Zutaten mit `is_standalone_food=True` direkt als `MealItem` mit `ingredient_id` + Portion einem Meal hinzuzufügen — ohne Umweg über ein Dummy-Rezept. Das Feld `is_standalone_food` bleibt als Qualitätsmerkmal und Filter erhalten. Das Feld `standalone_type` entfällt.

#### Scenario: Standalone-Zutat als MealItem speichern
- **WHEN** ein Nutzer "Apfel" (is_standalone_food=True) über den Portionsauswahl-Dialog mit Portion "1 Stück" dem Meal hinzufügt
- **THEN** wird ein MealItem mit `ingredient_id=<Apfel-ID>`, `quantity=1`, `measuring_unit=<Stück-Einheit>` erstellt — kein recipe_id

#### Scenario: Einkaufsliste enthält Standalone-Zutat
- **WHEN** ein Meal ein ingredient-MealItem (Apfel, 1 Stück) enthält
- **THEN** erscheint der Apfel in der generierten Einkaufsliste mit korrekter Menge

### Requirement: Portionsauswahl-Dialog beim Hinzufügen einer Standalone-Zutat
Das System SHALL beim Klick auf eine Standalone-Zutat in der Meal-Plan-Suche einen Portionsauswahl-Dialog öffnen. Der Dialog SHALL alle verfügbaren Portionen der Zutat zur Auswahl anzeigen. Die Default-Portion SHALL vorausgewählt sein.

#### Scenario: Dialog zeigt Portionen der Zutat
- **WHEN** der Nutzer in der Meal-Plan-Suche auf eine Standalone-Zutat klickt
- **THEN** öffnet sich ein Dialog mit der Liste aller Portionen (z.B. "1 Stück (182g)", "100g", "½ Stück")
- **AND** die Default-Portion ist vorausgewählt

#### Scenario: Auswahl erstellt MealItem
- **WHEN** der Nutzer im Dialog eine Portion wählt und bestätigt
- **THEN** wird ein MealItem mit der gewählten Portion erstellt und der Dialog schließt sich

### Requirement: Standalone-Zutaten in der Meal-Plan-Suche
Das System SHALL im Suchendpunkt `/meal-plans/recipes/search/` Zutaten mit `is_standalone_food=True` immer zusammen mit Rezepten zurückliefern — ohne separaten Filter-Parameter und ohne Abhängigkeit von `standalone_type`.

#### Scenario: Standalone-Zutat erscheint in der Suche
- **WHEN** der Nutzer im Meal-Plan-Suchdialog "Apfel" eingibt
- **THEN** erscheint der Apfel im `ingredients`-Feld der Response (sofern `is_standalone_food=True`)

#### Scenario: Suche ohne Suchbegriff liefert alle Standalone-Zutaten
- **WHEN** der Suchendpunkt ohne Suchbegriff aufgerufen wird
- **THEN** werden alle Zutaten mit `is_standalone_food=True` zurückgeliefert (bis zum Limit)

### Requirement: Typ-Badge für ingredient-MealItems in der UI
Das System SHALL ingredient-MealItems in der Meal-Plan-Ansicht (Meal-Slot) und in der Suchergebnis-Liste visuell durch ein Badge "Zutat" von Rezept-Items unterscheiden. Ansonsten SHALL die Darstellung identisch zu Rezept-Items sein.

#### Scenario: Zutat-Badge im Suchergebnis
- **WHEN** Suchergebnisse Rezepte und Standalone-Zutaten enthalten
- **THEN** trägt jede Zutat ein Badge "Zutat", jedes Rezept kein oder ein typ-spezifisches Badge

#### Scenario: Zutat-Badge im Meal-Slot
- **WHEN** ein Meal ein ingredient-MealItem enthält
- **THEN** wird es im Meal-Slot wie ein Rezept dargestellt, aber mit Badge "Zutat"

### Requirement: Signal und Dummy-Rezepte entfernen
Das System SHALL das Signal `create_dummy_recipe_for_standalone_food` nicht mehr ausführen. Bestehende Dummy-Rezepte (identifiziert durch `recipe_type='ingredient'` und genau einem RecipeItem) MÜSSEN per idempotenten Management Command zu ingredient-MealItems konvertiert und anschließend gelöscht werden.

#### Scenario: Kein neues Dummy-Rezept bei is_standalone_food
- **WHEN** `is_standalone_food` auf einer Zutat auf True gesetzt wird
- **THEN** wird kein Rezept automatisch erstellt

#### Scenario: Bereinigung konvertiert bestehende Dummy-Rezepte
- **WHEN** der Management Command `migrate_standalone_to_ingredient_items` ausgeführt wird
- **THEN** werden alle MealItems, die ein Dummy-Rezept (recipe_type='ingredient') referenzieren, zu ingredient-MealItems konvertiert
- **AND** die Dummy-Rezepte werden gelöscht
- **AND** der Command ist idempotent (wiederholter Aufruf erzeugt keine Duplikate)

### Requirement: standalone_type entfernt
Das Feld `standalone_type` auf `Ingredient` ist entfallen. Es MUSS per `makemigrations supply` aus dem Datenbankschema entfernt werden. Pydantic-Schemas (`supply/schemas/ingredients.py`) und Zod-Schemas im Frontend sind entsprechend zu bereinigen.
