## MODIFIED Requirements

### Requirement: Ingredient visibility and mutation
Private Ingredients SHALL be readable and editable only by their owner or Staff. Portion, Package, and Alias mutations SHALL require Ingredient edit access. Group admins SHALL be allowed to edit group-visible Ingredients.

Ingredient read access SHALL be defined once and applied identically by the object check (`can_read`) and the queryset (`visible_ingredient_queryset`):
- System Ingredients (`owner=None`) with `status="verified"` SHALL be readable by everyone, including anonymous users.
- System Ingredients with `status="draft"` SHALL be readable only by their creator (`created_by`), Collaborators, and Staff.
- User Ingredients (`owner` set) SHALL be readable by owner, Collaborators, shared groups, and Staff; with `visibility="public"` (only possible when `status="verified"`) by everyone.

Verified Ingredients SHALL be editable only by Staff, including by their owner. The policy MUST NOT reference any Ingredient status other than `draft` and `verified`. All Ingredient read paths (detail, list, search, autocomplete, breakfast catalog, nutrition, exports) SHALL use this policy; no parallel visibility helpers SHALL exist.

#### Scenario: Unrelated user mutates Ingredient portion
- **WHEN** an authenticated unrelated user changes a Portion
- **THEN** the API SHALL return HTTP 404 or 403 according to resource visibility and SHALL not mutate data

#### Scenario: Owner edits Ingredient Package
- **WHEN** the Ingredient owner changes a Package of their draft Ingredient
- **THEN** the API SHALL persist the change

#### Scenario: Anonymous user reads verified system Ingredient
- **GIVEN** no user is authenticated
- **WHEN** `GET /api/ingredients/{slug}/` is requested for a system Ingredient with `status="verified"`
- **THEN** the API SHALL return HTTP 200

#### Scenario: Anonymous user reads draft system Ingredient
- **GIVEN** no user is authenticated
- **WHEN** `GET /api/ingredients/{slug}/` is requested for a system Ingredient with `status="draft"`
- **THEN** the API SHALL return HTTP 404

#### Scenario: Creator finds own draft
- **GIVEN** user A created a system draft Ingredient (`created_by=A`, `owner=None`)
- **WHEN** A searches `GET /api/ingredients/?q=<name>&page=1&page_size=20`
- **THEN** the draft SHALL be in `items` and counted in `total`

#### Scenario: Non-staff user edits verified Ingredient
- **GIVEN** an authenticated non-staff user, also when they are the owner
- **WHEN** they send `PATCH /api/ingredients/{slug}/` or change a Portion, Package, or Alias of a verified Ingredient
- **THEN** the API SHALL return HTTP 403 and SHALL not mutate data

#### Scenario: Object check and queryset agree
- **WHEN** any Ingredient is evaluated for any user
- **THEN** `can_read(ingredient, user)` SHALL be true exactly when the Ingredient is contained in `visible_ingredient_queryset(user)`, except for the transitive and plan exceptions defined in "Ingredient reference exceptions"

## ADDED Requirements

### Requirement: Ingredient reference exceptions
Two paths MAY reference Ingredients beyond normal read access, and only these:
1. MealItem creation and the breakfast builder MAY reference system draft Ingredients and system draft Recipes by ID (`allow_system_draft`).
2. The recipe ingredient matcher SHALL choose candidates from Ingredients the user can read plus system draft Ingredients (`owner=None`).

Neither path SHALL ever expose private or shared Ingredients of other users.

#### Scenario: Matcher does not leak private Ingredients
- **GIVEN** user B owns a private Ingredient "Omas Pesto"
- **WHEN** user A imports a recipe containing "Omas Pesto"
- **THEN** the matcher SHALL NOT propose B's Ingredient as candidate

#### Scenario: Matcher reuses system draft
- **GIVEN** a system draft Ingredient "Kidneybohnen aus der Dose" exists
- **WHEN** a non-staff user imports a recipe containing "Kidneybohnen aus der Dose"
- **THEN** the matcher SHALL propose the existing draft instead of creating a new Ingredient

#### Scenario: System draft added to meal plan
- **GIVEN** an editor of a meal plan
- **WHEN** they add a system draft Ingredient by ID to a meal
- **THEN** the MealItem SHALL be created

#### Scenario: Other user's private Ingredient added to meal plan
- **WHEN** a user adds another user's private Ingredient by ID to a meal
- **THEN** the API SHALL return HTTP 404 and SHALL not create a MealItem
