## ADDED Requirements

### Requirement: Central food access policy
The backend SHALL evaluate Food read, edit, delete, fork, and export access through one central policy covering Recipe, Ingredient, Portion, Package, MealPlan, and Event resources.

#### Scenario: Unauthenticated access to private resource
- **WHEN** an unauthenticated user requests a private Food resource
- **THEN** the API SHALL return HTTP 404

#### Scenario: Staff access
- **WHEN** a staff user requests any Food resource
- **THEN** the policy SHALL grant read and edit access

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

#### Scenario: Unrelated user mutates Ingredient portion
- **WHEN** an authenticated unrelated user changes a Portion
- **THEN** the API SHALL return HTTP 404 or 403 according to resource visibility and SHALL not mutate data

#### Scenario: Owner edits Ingredient Package
- **WHEN** the Ingredient owner changes a Package
- **THEN** the API SHALL persist the change

### Requirement: Cross-resource authorization
Nutrition, Suggestions, Estimate, MealItem creation, public catalogs, and exports SHALL apply the central policy to every referenced Recipe and Ingredient.

#### Scenario: Unauthorized Recipe is submitted to MealPlan
- **WHEN** a user adds a Recipe they cannot read to a MealItem
- **THEN** the API SHALL reject the request and SHALL not create a MealItem

#### Scenario: Private Recipe in public catalog
- **WHEN** an anonymous user requests a public Food catalog
- **THEN** private and group-only Recipes SHALL not appear
