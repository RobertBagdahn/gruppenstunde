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

### Requirement: Estimate uses live rank=1 portion, never a deleted or stale portion
The quantity estimation SHALL convert the AI-estimated grams into the unit of the ingredient's currently active (`deleted_at IS NULL`) `rank=1` portion — not the `RecipeItem`'s stored portion, and never a soft-deleted portion. The response SHALL include the resolved `portion_id` so the frontend can apply both quantity and portion atomically.

#### Scenario: Item stored on a non-rank=1 portion
- **WHEN** a `RecipeItem` has `portion.rank = 2` (e.g. "1 Prise Salz", `weight_g = 0.3`) and the ingredient's active `rank=1` portion is "100g Salz" (`weight_g = 100`), and the AI estimates 3g per person
- **THEN** the response SHALL contain `quantity_per_portion = 0.03`, `portion_id = <id of the rank=1 "100g Salz" portion>`, `unit = "Gramm"`
- **THEN** the response SHALL NOT reference the item's originally stored portion

#### Scenario: Item's stored portion is soft-deleted
- **WHEN** a `RecipeItem.portion_id` points to a portion with `deleted_at IS NOT NULL`
- **THEN** the estimation SHALL resolve `target_portion` via the ingredient's currently active `rank=1` portion, ignoring the deleted stored portion entirely

#### Scenario: Item already stored on rank=1 portion
- **WHEN** a `RecipeItem` is already stored on its ingredient's active `rank=1` portion (`weight_g = 100`) and the AI estimates 80g per person
- **THEN** the response SHALL contain `quantity_per_portion = 0.8`, `portion_id = <item.portion_id>`, `unit = "Gramm"`

### Requirement: Frontend applies estimate with portion and quantity atomically
When the user applies AI-estimated quantities in the `InlineIngredientEditor`, the frontend SHALL update both `portion_id` and `quantity` for each selected item in a single state update, using the values from the estimate response. The frontend MUST NOT apply `quantity_per_portion` while leaving the item's previous `portion_id` unchanged.

#### Scenario: Apply estimate with unchanged portion
- **WHEN** the estimate response's `portion_id` equals the item's current `portion_id`
- **THEN** the frontend SHALL set `quantity` to `quantity_per_portion` and mark `isDirty: true`

#### Scenario: Apply estimate with different portion
- **WHEN** the estimate response's `portion_id` differs from the item's current `portion_id` (e.g. item was stored on "1 Prise Salz", estimate targets "100g Salz")
- **THEN** the frontend SHALL update both `portion_id` and `quantity` to the estimate's values in the same state update
- **THEN** the frontend SHALL mark `isDirty: true` so the change is persisted on save

#### Scenario: Regression — recipe #59 "Linsensuppe" scenario
- **WHEN** the estimate is applied to a recipe where at least one item is stored on a non-rank=1 or soft-deleted portion (as verified live for items "Olivenöl nativ extra", "Jodsalz", "gemahlener schwarzer Pfeffer")
- **THEN** the persisted gram amount for each of these items SHALL equal the AI's intended `grams_total` (within rounding tolerance), not a value inflated by the mismatched portion's `weight_g`

### Requirement: Backend plausibility check on save
When a `RecipeItem` is updated as part of applying an AI quantity estimate, the backend SHALL verify that `quantity × portion.weight_g` is within a small tolerance (e.g. ±1%) of the AI's originally estimated gram amount for that item. If the check fails, the backend SHALL reject the update with an error instead of silently persisting an inconsistent value.

#### Scenario: Consistent update passes the check
- **WHEN** a `RecipeItem` update sets `quantity` and `portion_id` such that `quantity × portion.weight_g` matches the AI-estimated grams within tolerance
- **THEN** the update SHALL be persisted normally

#### Scenario: Inconsistent update is rejected
- **WHEN** a `RecipeItem` update would result in `quantity × portion.weight_g` deviating from the AI-estimated grams beyond tolerance (e.g. due to a client bug re-introducing the portion/quantity mismatch)
- **THEN** the backend SHALL reject the update with an error and SHALL NOT persist the inconsistent value
