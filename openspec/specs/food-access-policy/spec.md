# food-access-policy Specification

## Purpose

This specification defines centralized authorization and visibility for Food resources.
## Requirements
### Requirement: Central food access policy
The backend SHALL evaluate Food read, edit, delete, fork, and export access through one central policy covering Recipe, Ingredient, Portion, Package, MealPlan, and Event resources. Delete access SHALL NOT be derived from edit access for collaborator roles: a `ContentCollaborator` with role `editor` SHALL be able to edit but SHALL NOT be able to delete shared Food content. Only the owner, a collaborator with role `admin`, or Staff SHALL delete shared content.

#### Scenario: Unauthenticated access to private resource
- **WHEN** an unauthenticated user requests a private Food resource
- **THEN** the API SHALL return HTTP 404

#### Scenario: Staff access
- **WHEN** a staff user requests any Food resource
- **THEN** the policy SHALL grant read and edit access

#### Scenario: Editor collaborator cannot delete shared Recipe
- **WHEN** a collaborator with role `editor` attempts to delete a shared Recipe
- **THEN** the API SHALL return HTTP 403 and SHALL not delete the Recipe

#### Scenario: Owner can delete shared Recipe
- **WHEN** the owner deletes a Recipe shared with others
- **THEN** the API SHALL delete the Recipe

#### Scenario: Admin collaborator can delete
- **WHEN** a collaborator with role `admin` deletes the shared Recipe
- **THEN** the API SHALL delete the Recipe

### Requirement: Recipe visibility
Private Recipes SHALL be visible to their owner, Collaborators, and active members of explicitly assigned groups. Public Recipes SHALL be visible anonymously. Group admins SHALL be allowed to edit group-visible Recipes.

#### Scenario: Group member reads group Recipe
- **WHEN** an active member of an assigned group requests a group-visible Recipe
- **THEN** the API SHALL return the Recipe with `can_edit` determined by the member's role

#### Scenario: Unrelated user reads private Recipe
- **WHEN** an authenticated unrelated user requests a private Recipe
- **THEN** the API SHALL return HTTP 404

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

### Requirement: Cross-resource authorization
Nutrition, Suggestions, Estimate, MealItem creation, public catalogs, and exports SHALL apply the central policy to every referenced Recipe and Ingredient.

#### Scenario: Unauthorized Recipe is submitted to MealPlan
- **WHEN** a user adds a Recipe they cannot read to a MealItem
- **THEN** the API SHALL reject the request and SHALL not create a MealItem

#### Scenario: Private Recipe in public catalog
- **WHEN** an anonymous user requests a public Food catalog
- **THEN** private and group-only Recipes SHALL not appear

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
