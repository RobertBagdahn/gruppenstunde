## ADDED Requirements

### Requirement: Server-side duplicate protection in AI apply endpoint
The `POST /api/recipes/{recipe_id}/ai-apply-ingredients/` endpoint SHALL NOT create `RecipeItem`s for any `portion_id` whose underlying `Portion.ingredient_id` already exists in a `RecipeItem` of the same recipe. Filtered-out suggestions SHALL be silently skipped; the response contains only the actually created items.

#### Scenario: Apply with no duplicates
- **WHEN** user applies a list of 3 suggestions, none of which match existing recipe items
- **THEN** 3 `RecipeItem`s SHALL be created with `sort_order` continuing from the last existing item
- **THEN** the response SHALL contain 3 items

#### Scenario: Apply with duplicate ingredient
- **WHEN** user applies a list of 3 suggestions and one of them has a `portion_id` whose `Portion.ingredient_id` matches an existing `RecipeItem` of the recipe
- **THEN** only 2 `RecipeItem`s SHALL be created
- **THEN** the response SHALL contain only the 2 created items
- **THEN** the recipe nutritional cache SHALL be recalculated once after all creates

#### Scenario: Apply with all duplicates
- **WHEN** user applies a list where every `portion_id`'s `Portion.ingredient_id` matches existing items
- **THEN** 0 `RecipeItem`s SHALL be created
- **THEN** the response SHALL be an empty list `[]`
- **THEN** no cache recalculation SHALL be triggered

### Requirement: Frontend filters AI suggestions against editor state
The `InlineIngredientEditor.handleAiSuggest` SHALL filter the backend response against the current `editItems` state before showing suggestions to the user. Suggestions whose `ingredient_id` matches an active or `isDeleted` `EditableItem` SHALL be excluded from the displayed suggestion list.

#### Scenario: AI suggests already-deleted ingredient
- **WHEN** user has just deleted "Salz" (`isDeleted: true` in `editItems`) and triggers AI suggest
- **THEN** the suggestion list SHALL NOT contain "Salz" (or any other ingredient whose `ingredient_id` matches a deleted item)

#### Scenario: AI suggests already-active ingredient
- **WHEN** user has "Zucker" active in the editor and triggers AI suggest
- **THEN** the suggestion list SHALL NOT contain "Zucker"

#### Scenario: AI suggests new ingredient
- **WHEN** the suggestion's `ingredient_id` is not present in any `EditableItem`
- **THEN** the suggestion SHALL appear in the list with checkbox checked by default

### Requirement: CSRF token in AI fetch calls
The `handleAiSuggest` and `handleApplyAiSuggestions` fetch calls SHALL include an `X-CSRFToken` header with the value from `getCsrfToken()` from `@/lib/api`, consistent with other POST mutations in the same component.

#### Scenario: Suggest call includes CSRF
- **WHEN** user clicks "Weitere Zutaten" and `handleAiSuggest` fires
- **THEN** the POST request to `/api/recipes/{recipe_id}/ai-suggest-ingredients/` SHALL include `X-CSRFToken` header

#### Scenario: Apply call includes CSRF
- **WHEN** user clicks "Übernehmen" in the AI suggestions dialog and `handleApplyAiSuggestions` fires
- **THEN** the POST request to `/api/recipes/{recipe_id}/ai-apply-ingredients/` SHALL include `X-CSRFToken` header and `Content-Type: application/json`
