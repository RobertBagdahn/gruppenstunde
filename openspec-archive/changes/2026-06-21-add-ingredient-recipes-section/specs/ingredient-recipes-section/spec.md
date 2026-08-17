## ADDED Requirements

### Requirement: API endpoint returns recipes for an ingredient
The system SHALL provide a `GET /api/ingredients/{slug}/recipes/` endpoint that returns a paginated list of approved, visible recipes using the specified ingredient.

#### Scenario: Successful response with recipes
- **WHEN** `GET /api/ingredients/{slug}/recipes/` is called with `page=1&page_size=20`
- **AND** the ingredient exists and has approved, visible recipes
- **THEN** the response SHALL have status 200
- **AND** the response body SHALL be `PaginatedRecipeSimilarOut` with `items` containing `RecipeSimilarOut` objects (id, title, slug, summary, image_url, difficulty, execution_time)
- **AND** `total`, `page`, `page_size`, `total_pages` SHALL be present

#### Scenario: Ingredient has no recipes
- **WHEN** `GET /api/ingredients/{slug}/recipes/` is called
- **AND** the ingredient exists but has no approved recipes
- **THEN** the response SHALL have status 200
- **AND** `items` SHALL be an empty array
- **AND** `total` SHALL be 0

#### Scenario: Ingredient not found
- **WHEN** `GET /api/ingredients/{slug}/recipes/` is called
- **AND** no ingredient with the given slug exists
- **THEN** the response SHALL have status 404

#### Scenario: Pagination works correctly
- **WHEN** `GET /api/ingredients/{slug}/recipes/?page=2&page_size=5` is called
- **AND** the ingredient has 12 approved, visible recipes
- **THEN** the response SHALL contain 5 items (recipes 6-10)
- **AND** `total` SHALL be 12
- **AND** `total_pages` SHALL be 3
- **AND** `page` SHALL be 2
- **AND** `page_size` SHALL be 5

#### Scenario: Only approved recipes are returned
- **WHEN** `GET /api/ingredients/{slug}/recipes/` is called
- **AND** the ingredient is used in both approved and draft recipes
- **THEN** only approved recipes SHALL appear in `items`
- **AND** draft recipes SHALL be excluded

#### Scenario: Visibility filtering is applied
- **WHEN** `GET /api/ingredients/{slug}/recipes/` is called by an unauthenticated user
- **AND** the ingredient is used in a private recipe (visibility=private)
- **THEN** the private recipe SHALL NOT appear in `items`

#### Scenario: Own private recipes visible to owner
- **WHEN** `GET /api/ingredients/{slug}/recipes/` is called by an authenticated user
- **AND** the user owns a matching private recipe
- **THEN** the user's own recipe SHALL appear in `items`

#### Scenario: Staff sees all approved recipes
- **WHEN** `GET /api/ingredients/{slug}/recipes/` is called by a staff user
- **AND** the ingredient is used in private recipes by other users
- **THEN** all approved recipes SHALL appear in `items`

### Requirement: PaginatedRecipeSimilarOut and PaginatedRecipeSimilarSchema
The backend SHALL define a `PaginatedRecipeSimilarOut` schema in `supply/schemas/ingredients.py` wrapping `list[RecipeSimilarOut]` with `total`, `page`, `page_size`, `total_pages`. The frontend SHALL define a matching `PaginatedRecipeSimilarSchema` (Zod) in `frontend-food/src/schemas/recipe.ts`.

#### Scenario: Backend paginated wrapper
- **WHEN** the endpoint response is generated
- **THEN** the response SHALL match `PaginatedRecipeSimilarOut` type

#### Scenario: Frontend Zod schema matches backend
- **WHEN** the frontend parses the API response
- **THEN** `PaginatedRecipeSimilarSchema` SHALL parse successfully
- **AND** the Zod schema SHALL have the same fields as the Pydantic schema (1:1 sync)

### Requirement: Ingredient detail page shows recipes section
The IngredientDetailPage SHALL display a „Rezepte mit dieser Zutat" section at the bottom of the page, showing approved recipes that use this ingredient. All icons in this section SHALL use Lucide icons.

#### Scenario: Ingredient has recipes
- **WHEN** a user views an ingredient detail page
- **AND** the ingredient has approved recipes
- **THEN** a section titled „Rezepte mit dieser Zutat" SHALL be displayed
- **AND** up to 20 recipe cards SHALL be shown in a responsive grid (2 columns on mobile, 3 on desktop)
- **AND** each card SHALL show the recipe image, title, difficulty (with Lucide `<ChefHat />` icon), and execution time (with Lucide `<Clock />` icon)
- **AND** clicking a card SHALL navigate to the recipe detail page `/recipes/{slug}`

#### Scenario: Ingredient has no recipes (empty state)
- **WHEN** a user views an ingredient detail page
- **AND** the ingredient has no approved recipes
- **THEN** a section titled „Rezepte mit dieser Zutat" SHALL be displayed
- **AND** a message „Noch kein Rezept mit dieser Zutat." SHALL be shown
- **AND** a button „Rezept mit {Zutat} erstellen" with Lucide `<Plus />` icon SHALL be displayed

### Requirement: CTA navigates to recipe creation with pre-filled ingredient
The empty state button SHALL navigate to the recipe creation page with the ingredient pre-filled including `portion_id`.

#### Scenario: Click CTA button
- **WHEN** a user clicks „Rezept mit {name} erstellen"
- **THEN** the user SHALL be navigated to `/recipes/new?ingredient={slug}`
- **AND** the ingredient slug SHALL be passed as URL query parameter

#### Scenario: CreateRecipePage reads ingredient param and resolves portion
- **WHEN** the CreateRecipePage loads with `?ingredient={slug}` in the URL
- **AND** the ingredient exists and has at least one portion
- **THEN** the ingredient SHALL be pre-added to the recipe's ingredient list
- **AND** the ingredient's default portion (is_default=true, or first portion if none is default) SHALL be used
- **AND** `portion_id` SHALL be set to the portion's ID
- **AND** quantity SHALL be set to 1

#### Scenario: Invalid ingredient slug in URL
- **WHEN** the CreateRecipePage loads with `?ingredient=non-existent-slug`
- **AND** the ingredient does not exist
- **THEN** no ingredient SHALL be pre-added
- **AND** no error SHALL be shown
- **AND** the user SHALL see the standard empty recipe form

### Requirement: Frontend API hook for recipes by ingredient
The frontend SHALL provide a `useRecipesByIngredient(slug)` TanStack Query hook.

#### Scenario: Hook calls correct endpoint
- **WHEN** `useRecipesByIngredient('mehl')` is called
- **THEN** a GET request SHALL be made to `/api/ingredients/mehl/recipes/`
- **AND** the response SHALL be validated against `PaginatedRecipeSimilarSchema`
- **AND** the response SHALL be cached under the query key `['ingredient-recipes', 'mehl', page]`

#### Scenario: Hook returns paginated data
- **WHEN** `useRecipesByIngredient('mehl', { page: 2 })` is called
- **THEN** the request SHALL include `?page=2`
- **AND** the hook SHALL return the paginated response with `items`, `total`, `page`, `page_size`, `total_pages`
