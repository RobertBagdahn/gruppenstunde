## MODIFIED Requirements

### Requirement: Cached nutrition fields on Recipe
The Recipe model SHALL cache only `cached_vitamin_c_mg` as micronutrient cache field. The fields `cached_vitamin_a_mg`, `cached_vitamin_d_ug`, `cached_vitamin_b12_ug`, `cached_calcium_mg`, `cached_iron_mg` SHALL be removed.

The Recipe model's `embedding` field SHALL be migrated from `BinaryField` to `VectorField(dimensions=768)`.

The Recipe model SHALL include the following new fields:
- `quality_score` (IntegerField, nullable, default NULL, validators=[0..100])
- `quality_score_updated_at` (DateTimeField, nullable, default NULL)

#### Scenario: Recipe cache recalculation
- **WHEN** `recalculate_recipe_cache` runs
- **THEN** only `cached_vitamin_c_mg` is calculated and stored as micronutrient cache (macros unaffected)

#### Scenario: Nutrition breakdown API response
- **WHEN** the nutrition breakdown endpoint is called
- **THEN** micronutrient totals include only `vitamin_c_mg`

#### Scenario: Recipe embedding is pgvector
- **WHEN** a Recipe is saved
- **THEN** the embedding SHALL be stored as VectorField(768) via pgvector
- **THEN** cosine distance queries SHALL be supported via PostgreSQL `<=>` operator

#### Scenario: Recipe quality score in API
- **WHEN** `GET /api/recipes/{id}/` is called
- **THEN** the response SHALL include `quality_score` and `quality_score_updated_at`

### Requirement: Embedding-based recipe duplicate detection
The Recipe API SHALL provide endpoints that find similar recipes, merge them, and dismiss false-positive pairs.

#### Scenario: Find duplicate recipes
- **WHEN** Staff-User `GET /api/recipes/{id}/duplicates/?threshold=0.05` is called
- **THEN** a paginated list of similar recipes with similarity scores SHALL be returned
- **THEN** each result SHALL contain `{id, title, slug, similarity}`

#### Scenario: Duplicate list for all recipes
- **WHEN** Staff-User `GET /api/admin/data-quality/recipes/duplicates/?threshold=0.05` is called
- **THEN** all recipe pairs with cosine_distance < threshold SHALL be returned
- **THEN** the response SHALL be paginated
- **THEN** already dismissed pairs SHALL be excluded from the response

#### Scenario: Preview merge
- **WHEN** Staff-User `GET /api/admin/data-quality/recipes/merge/preview/?source_id={id}&target_id={id}` is called
- **THEN** the response SHALL contain `{source_id, source_name, target_id, target_name, affected_meal_count}`
- **THEN** `affected_meal_count` SHALL count MealItem objects referencing the source recipe

#### Scenario: Merge duplicate recipes
- **WHEN** Staff-User `POST /api/admin/data-quality/recipes/merge/` with `{source_id, target_id}` is called
- **THEN** the source recipe SHALL be soft-deleted (`deleted_at` set)
- **THEN** a ContentLink with `link_type="duplicate_merged"` SHALL be created between source and target
- **THEN** the same pair SHALL NOT be mergeable again (error on duplicate)

#### Scenario: Dismiss duplicate pair
- **WHEN** Staff-User `POST /api/admin/data-quality/recipes/duplicates/dismiss/` with `{recipe_a_id, recipe_b_id}` is called
- **THEN** a DuplicateDismissal entry SHALL be created for this pair
- **THEN** the pair SHALL no longer appear in duplicate detection results

#### Scenario: Undismiss duplicate pair
- **WHEN** Staff-User `DELETE /api/admin/data-quality/recipes/duplicates/dismiss/` with `{recipe_a_id, recipe_b_id}` is called
- **THEN** the DuplicateDismissal entry SHALL be removed
- **THEN** the pair SHALL reappear in duplicate detection results (if still within threshold)

### Requirement: duplicate_merged LinkType
The `LinkType` choices SHALL include `"duplicate_merged"` for ContentLinks created during recipe merge.

#### Scenario: LinkType choice available
- **WHEN** a ContentLink is created by recipe merge
- **THEN** `link_type` SHALL be set to `"duplicate_merged"`
- **THEN** the `LinkType.choices` SHALL include `"duplicate_merged"`

### Requirement: Recipe embedding text enriched with ingredient data
Der Recipe-Embedding-Text SHALL neben title, summary, description und tags auch die vollständigen Daten aller zugehörigen Ingredients (via RecipeItems → Portions → Ingredients) als menschenlesbaren Text enthalten.

#### Scenario: Embedding-Text enthält Zutaten-Daten
- **WHEN** der Embedding-Text für ein Recipe gebaut wird
- **THEN** SHALL der Text die Namen und Nährwert-Informationen aller Ingredients enthalten
- **THEN** SHALL jede Zutat mit ihren wichtigsten Nährwerten (kcal, Eiweiß, Fett, Kohlenhydrate, Nutri-Score) repräsentiert sein
- **THEN** SHALL der Text pro Ingredient auf maximal 150 Zeichen begrenzt sein, um das Embedding-Input-Limit (2048 Tokens) nicht zu überschreiten

#### Scenario: Recipe ohne Zutaten
- **WHEN** ein Recipe keine RecipeItems hat
- **THEN** SHALL der Embedding-Text nur aus title, summary, description und tags bestehen
- **THEN** SHALL kein Fehler geworfen werden

### Requirement: Recipe embedding auto-generated on save
Das System SHALL bei jedem Save eines Recipes automatisch ein Embedding generieren, über einen `post_save`-Signal der asynchron nach dem Transaction-Commit läuft.

#### Scenario: Embedding bei Recipe-Save
- **WHEN** ein Recipe erstellt oder aktualisiert wird
- **THEN** SHALL nach dem erfolgreichen Transaction-Commit ein Embedding asynchron generiert werden
- **THEN** SHALL der Embedding-Text via `build_recipe_embedding_text()` gebaut werden
- **THEN** SHALL das Embedding via `create_embedding()` erzeugt und im `embedding`-Feld gespeichert werden

#### Scenario: Kein Embedding bei unveränderten Feldern
- **WHEN** ein Recipe aktualisiert wird, aber title, summary, description, recipe_type und servings unverändert bleiben
- **THEN** SHALL kein neues Embedding generiert werden
- **THEN** SHALL `embedding_updated_at` unverändert bleiben

#### Scenario: Embedding-Fehler blockiert Save nicht
- **WHEN** die Embedding-Generierung fehlschlägt
- **THEN** SHALL der Recipe-Save NICHT fehlschlagen
- **THEN** SHALL `embedding` auf dem vorherigen Wert bleiben
- **THEN** SHALL der Fehler geloggt werden

### Requirement: RecipeItem changes trigger recipe embedding update
Das System SHALL bei jeder Änderung an RecipeItems (create, update, delete) das zugehörige Recipe-Embedding asynchron neu generieren.

#### Scenario: RecipeItem hinzugefügt
- **WHEN** ein RecipeItem zu einem Recipe hinzugefügt wird
- **THEN** SHALL nach dem Transaction-Commit das Recipe-Embedding asynchron neu generiert werden
- **THEN** SHALL das neue Embedding die aktualisierten Zutaten-Daten enthalten

#### Scenario: RecipeItem gelöscht
- **WHEN** ein RecipeItem von einem Recipe entfernt wird
- **THEN** SHALL nach dem Transaction-Commit das Recipe-Embedding asynchron neu generiert werden
- **THEN** SHALL das neue Embedding die aktualisierten Zutaten-Daten enthalten

#### Scenario: Kein Cascade bei Ingredient-Änderung
- **WHEN** eine Zutat (Nährwerte, Name, etc.) geändert wird
- **THEN** SHALL das System KEINE Recipe-Embeddings der Recipes neu generieren, die diese Zutat verwenden
- **THEN** SHALL die Recipe-Embeddings erst beim nächsten Recipe-eigenen Save aktualisiert werden

### Requirement: Embedding-based similar recipes endpoint
Der `GET /api/recipes/{id}/similar/` Endpoint SHALL ähnliche Recipes basierend auf pgvector Embedding Cosine Distance finden.

#### Scenario: Ähnliche Recipes via Embedding
- **WHEN** `GET /api/recipes/{recipe_id}/similar/` aufgerufen wird
- **THEN** SHALL die Antwort eine Liste von bis zu 6 ähnlichen Recipes sein
- **THEN** SHALL jedes Element `{id, title, slug, distance}` enthalten
- **THEN** SHALL die Liste nach `distance` aufsteigend sortiert sein
- **THEN** SHALL das angefragte Recipe selbst nicht in den Ergebnissen sein
- **THEN** SHALL die Suche pgvector `CosineDistance` verwenden

#### Scenario: Kein Embedding vorhanden
- **WHEN** das angefragte Recipe kein Embedding hat
- **THEN** SHALL eine leere Liste zurückgegeben werden

#### Scenario: Visibility
- **WHEN** der Endpoint aufgerufen wird
- **THEN** SHALL nur Recipes mit `status=approved` in den Ergebnissen sein
- **THEN** SHALL ähnliche Recipes über alle Recipes hinweg gefunden werden (global, nicht user-spezifisch)

### Requirement: Recipe Folder Assignment
Recipe SHALL have an optional folder FK for organization of personal recipes.

#### Scenario: Filter by folder
- **WHEN** GET /api/recipes/my-recipes/?folder={id} is called
- **THEN** only recipes in that folder SHALL be returned

### Requirement: Recipe Type Choices
Recipe recipe_type choices SHALL include: breakfast, warm_meal, cold_meal, dessert, recipe_part, drink, snack, ingredient.

### Requirement: URL Import
Recipe SHALL support creation from external URLs.

#### Scenario: Import from URL
- **WHEN** POST /api/recipes/import-from-url/ is called with a valid recipe URL
- **THEN** a preview of the parsed recipe data SHALL be returned

### Requirement: RecipeHint model structure
The RecipeHint model SHALL have the following fields: `name` (CharField), `description` (TextField, optional), `improvement_text` (TextField, optional), `hint` (CharField, displayed text), `value` (FloatField, threshold), `min_max` (CharField, "min"|"max"), `hint_level` (CharField, "info"|"warn"|"error"), `parameter` (CharField, choices from HintParameterChoices), `recipe_type` (CharField, required), `recipe_objective` (CharField, required).

#### Scenario: Minimum rule triggers
- **WHEN** a recipe's computed parameter value is below a hint's `value` where `min_max` = "min"
- **THEN** the hint is matched and returned in improvement results

#### Scenario: Maximum rule triggers
- **WHEN** a recipe's computed parameter value is above a hint's `value` where `min_max` = "max"
- **THEN** the hint is matched and returned in improvement results

#### Scenario: Required fields enforced
- **WHEN** a RecipeHint is created without `recipe_type` or `recipe_objective`
- **THEN** validation fails

### Requirement: Hint level visual differentiation in frontend
The frontend SHALL visually distinguish hint_level in RecipeImprovement cards using color coding.

#### Scenario: Warning level display
- **WHEN** a matched hint has `hint_level` = "warn"
- **THEN** the improvement card uses amber/orange styling (border and progress bar)

#### Scenario: Error level display
- **WHEN** a matched hint has `hint_level` = "error"
- **THEN** the improvement card uses red styling (border and progress bar)

#### Scenario: Info level display
- **WHEN** a matched hint has `hint_level` = "info"
- **THEN** the improvement card uses blue/gray styling

### Requirement: Hint text displayed as recommendation
The frontend SHALL display the `hint` field text as the recommendation text in improvement cards.

#### Scenario: Hint text shown
- **WHEN** a RecipeHint matches a recipe
- **THEN** the `hint` value (e.g. "viel mehr Gewicht") is displayed as the recommendation text in the improvement card

### Requirement: Ingredient list position on detail page
The recipe detail page SHALL display the ingredients section as the first content section directly below the hero area, before nutritional tags and preparation steps.

#### Scenario: User views recipe detail page
- **WHEN** a user opens a recipe detail page
- **THEN** the ingredients section is displayed directly below the hero/metadata area
- **THEN** the ingredients section appears before the nutritional tags section
- **THEN** the ingredients section appears before the preparation steps section

### Requirement: Portion display defaults to one portion
The ingredient quantities SHALL be displayed for exactly one portion by default. The header SHALL show "pro Portion" when the multiplier is 1, and "für X Portionen" when the multiplier is greater than 1.

#### Scenario: Default portion display
- **WHEN** a user opens a recipe detail page without changing portions
- **THEN** the ingredient header displays "pro Portion"
- **THEN** all quantities are shown divided by the recipe's base servings (normalized to 1 portion)

#### Scenario: Scaled portion display
- **WHEN** a user sets the portion scaler to 4
- **THEN** the ingredient header displays "für 4 Portionen"
- **THEN** all quantities are shown as 4x the single-portion amount

### Requirement: Single portion scaler location
The portion scaler control SHALL exist only in the desktop sidebar and the mobile bottom sheet. The IngredientList component MUST NOT contain an inline portion scaler.

#### Scenario: Desktop view
- **WHEN** a user views the recipe on desktop (lg breakpoint)
- **THEN** the portion scaler is visible in the sticky sidebar
- **THEN** no portion scaler is shown inside the ingredient list

#### Scenario: Mobile view
- **WHEN** a user views the recipe on mobile
- **THEN** the portion scaler is accessible via the mobile action bar bottom sheet
- **THEN** no portion scaler is shown inside the ingredient list

### Requirement: Sidebar portion scaler controls multiplier correctly
The sidebar portion scaler SHALL directly control the portion count (1, 2, 3...). Changing the value SHALL correctly scale ingredient quantities as `quantity / recipe.servings * portionCount`.

#### Scenario: Scaling up from default
- **WHEN** the recipe has base servings of 18 and user sets scaler to 3
- **THEN** each ingredient quantity is displayed as `original_quantity / 18 * 3`

#### Scenario: Scaler default value
- **WHEN** the recipe detail page loads
- **THEN** the portion scaler displays 1 as its initial value

### Requirement: Ingredient list uses larger font size
The ingredient list SHALL use `text-base` (1rem/16px) as the base font size for ingredient names and quantities instead of `text-sm` (0.875rem/14px).

#### Scenario: Visual size of ingredients
- **WHEN** a user views the ingredient list
- **THEN** ingredient names and quantities are rendered at text-base size (16px)

### Requirement: RecipeItem stores quantity per person
A RecipeItem SHALL store `quantity` as the amount per single person (1 Portion). The system SHALL NOT have a `quantity_type` field. All quantities are implicitly per-person. Since servings is always enforced as 1, quantity represents exactly what one person needs.

#### Scenario: Ingredient quantity interpretation
- **WHEN** a RecipeItem has quantity=50
- **THEN** the system interprets this as 50 units of the portion for 1 person

#### Scenario: Frontend scales for display
- **WHEN** the frontend displays a recipe for N persons
- **THEN** displayed quantity = RecipeItem.quantity × N

### Requirement: Recipe servings validation
The Recipe model SHALL enforce `servings=1` at the API level. All recipe quantities MUST be stored as per-1-portion values.

#### Scenario: API enforces servings=1 on create
- **WHEN** a recipe is created via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`

#### Scenario: API enforces servings=1 on update
- **WHEN** a recipe is updated via API with any `servings` value
- **THEN** the saved recipe SHALL have `servings=1`

### Requirement: Recipe preparation_method field

Das Recipe-Modell SHALL ein `preparation_method`-Feld (CharField, max_length=50, blank=True, choices) besitzen mit den folgenden Choices: cooking (Kochen), baking (Backen), frying (Braten), grilling (Grillen), raw (Rohkost), none (Keine Zubereitung).

#### Scenario: Preparation method in API response
- **WHEN** `GET /api/recipes/{id}/` aufgerufen wird
- **THEN** enthält die Response `preparation_method` mit dem gesetzten Wert oder leerem String

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
- **WHEN** `GET /api/recipes/?equipment_slug=ofen` aufgerufen wird
- **THEN** werden nur Rezepte mit Equipment "ofen" zurückgegeben
