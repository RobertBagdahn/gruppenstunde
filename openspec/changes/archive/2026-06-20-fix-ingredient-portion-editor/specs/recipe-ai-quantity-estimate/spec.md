## ADDED Requirements

### Requirement: AI quantity estimate endpoint
The system SHALL provide an API endpoint `POST /api/recipes/{recipe_id}/estimate-quantities/` that uses Gemini Flash to estimate realistic gram-amounts per person for all existing `RecipeItem`s of a recipe.

#### Scenario: Successful estimation
- **WHEN** authenticated user with edit permission calls the endpoint for a recipe with at least one `RecipeItem`
- **THEN** the system returns a list of `{ item_id, ingredient_name, quantity_per_portion, portion_id, unit }` entries — one per existing item
- **THEN** `quantity_per_portion` is the estimated amount per 1 person in the unit of the `portion_id`
- **THEN** `portion_id` is the currently stored portion of the item (not the ingredient's default portion)

#### Scenario: Recipe without items
- **WHEN** the recipe has no `RecipeItem`s
- **THEN** the system returns `null` (HTTP 200 with `{ items: null }` or HTTP 500)

#### Scenario: Gemini call fails
- **WHEN** the Gemini API call fails or returns invalid JSON
- **THEN** the endpoint returns HTTP 500 with error message "AI-Schätzung fehlgeschlagen"

#### Scenario: Unauthenticated user
- **WHEN** unauthenticated user calls the endpoint
- **THEN** the system returns HTTP 403

### Requirement: Estimate uses stored portion not default portion
The quantity estimation SHALL convert the AI-estimated grams into the unit of the currently stored `item.portion`, not the ingredient's default portion. The response SHALL include the `portion_id` so the frontend can apply both quantity and portion atomically.

#### Scenario: Item stored in "Esslöffel" portion
- **WHEN** a `RecipeItem` has `portion.name = "Esslöffel"` with `weight_g = 15` and the AI estimates 30g per person
- **THEN** the response SHALL contain `quantity_per_portion = 2.0`, `portion_id = <item.portion_id>`, `unit = "Esslöffel"`

#### Scenario: Item stored in "Gramm" portion
- **WHEN** a `RecipeItem` has `portion.name = "Gramm"` with `weight_g = 1` and the AI estimates 100g per person
- **THEN** the response SHALL contain `quantity_per_portion = 100.0`, `portion_id = <item.portion_id>`, `unit = "g"`

### Requirement: Frontend applies estimate with display-servings factor
When the user applies AI-estimated quantities in the `InlineIngredientEditor`, the frontend SHALL multiply `quantity_per_portion` by the current display servings (`servings ?? 1`) before setting the editor's display `quantity`. The existing save logic divides by `effectiveServings`, so the persisted per-1-portion value equals `quantity_per_portion`.

#### Scenario: Apply estimate at servings=1
- **WHEN** user clicks "Übernehmen" with `effectiveServings = 1`
- **THEN** the editor's `quantity` for each selected item SHALL be set to `quantity_per_portion`
- **THEN** on save, the stored per-1-portion quantity SHALL equal `quantity_per_portion`

#### Scenario: Apply estimate at servings=4
- **WHEN** user clicks "Übernehmen" with `effectiveServings = 4`
- **THEN** the editor's `quantity` for each selected item SHALL be set to `quantity_per_portion * 4`
- **THEN** on save, the stored per-1-portion quantity SHALL equal `quantity_per_portion` (because save divides by 4)

#### Scenario: Portion updated atomically with quantity
- **WHEN** the estimate response includes a `portion_id` different from the editor's current `portion_id` for that item
- **THEN** the frontend SHALL update both `portion_id` and `quantity` in a single state update, marking `isDirty: true`
