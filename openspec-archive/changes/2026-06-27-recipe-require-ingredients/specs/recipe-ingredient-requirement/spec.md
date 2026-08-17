## ADDED Requirements

### Requirement: Recipe ingredient requirement for status transition

A Recipe MUST have at least one RecipeItem before it can transition from `draft` to `submitted` or `approved` status. Recipes in `draft` status MAY exist without RecipeItems.

#### Scenario: Publish recipe without ingredients is blocked

- **WHEN** a user sets `visibility=public` on a personal recipe that has no RecipeItems
- **THEN** the system SHALL reject the request with HTTP 400
- **THEN** the error message SHALL read "Rezept benötigt mindestens eine Zutat zum Veröffentlichen"
- **THEN** the recipe SHALL remain in `draft` status with `private` visibility

#### Scenario: Publish recipe with ingredients succeeds

- **WHEN** a user sets `visibility=public` on a personal recipe that has at least one RecipeItem
- **THEN** the system SHALL accept the request
- **THEN** the recipe status SHALL change to `submitted`
- **THEN** the recipe visibility SHALL change to `public`

#### Scenario: Draft recipe without ingredients can be created

- **WHEN** a user creates a recipe without providing `recipe_items`
- **THEN** the system SHALL create the recipe with `status=draft`
- **THEN** the system SHALL NOT validate the presence of RecipeItems

#### Scenario: Update recipe removing all ingredients on non-draft is blocked

- **WHEN** a user sends `PATCH /api/recipes/{id}/` with `recipe_items=[]` on a recipe with `status=submitted` or `status=approved`
- **THEN** the system SHALL reject the request with HTTP 400
- **THEN** the error message SHALL read "Bei veröffentlichten Rezepten können nicht alle Zutaten entfernt werden"
- **THEN** the existing RecipeItems SHALL remain unchanged

#### Scenario: Update recipe removing all ingredients on draft succeeds

- **WHEN** a user sends `PATCH /api/recipes/{id}/` with `recipe_items=[]` on a recipe with `status=draft`
- **THEN** the system SHALL delete all existing RecipeItems
- **THEN** the recipe SHALL have zero RecipeItems

#### Scenario: Frontend publish button disabled without ingredients

- **WHEN** a user views the RecipeDetailPage for a recipe with zero RecipeItems and the recipe is in `draft` status
- **THEN** the "Veröffentlichen" button SHALL be disabled
- **THEN** a tooltip SHALL display "Erst Zutaten hinzufügen"

#### Scenario: Frontend publish button enabled with ingredients

- **WHEN** a user views the RecipeDetailPage for a recipe with at least one RecipeItem and the recipe is in `draft` status
- **THEN** the "Veröffentlichen" button SHALL be enabled

#### Scenario: Create page info box reflects new flow

- **WHEN** a user views the CreateRecipePage stepper step 1 ("Bearbeiten")
- **THEN** the info box SHALL display: "Zutaten können später im Zutaten-Editor hinzugefügt werden. Zum Veröffentlichen wird mindestens eine Zutat benötigt."

### Requirement: Admin bypass

Staff users SHALL be able to directly set recipe status to `approved` via Django Admin without ingredient validation.

#### Scenario: Staff approves recipe without ingredients via admin

- **WHEN** a staff user changes a recipe status to `approved` in Django Admin
- **THEN** the system SHALL accept the change regardless of RecipeItem count
