# food-e2e-regression-suite Specification

## Purpose
End-to-end browser regression testing suite for core Food module workflows, including authentication, CRUD roundtrips, wizard persistence, permission boundaries, export provenance, and responsive viewport behavior.

## Requirements

### Requirement: Deterministic authenticated E2E infrastructure
The Food E2E suite SHALL provide typed shared fixtures for authenticated browser contexts, isolated local state, deterministic resource names, request assertions, and reverse-order cleanup. Required tests MUST NOT depend on live AI providers or external websites.

#### Scenario: Authenticated fixture starts clean
- **WHEN** a test requests an authenticated Food page
- **THEN** the browser context SHALL contain a valid session and SHALL have cleared Food wizard `localStorage` state before the test begins

#### Scenario: Test resources are isolated
- **WHEN** two tests create resources with the same logical fixture type
- **THEN** their names and persisted assertions SHALL remain distinguishable and one test SHALL NOT rely on rows created by the other

#### Scenario: Cleanup removes dependent resources
- **WHEN** a test finishes after creating linked recipes, meal plans, shopping lists, and ingredients
- **THEN** cleanup SHALL remove resources in dependency order and SHALL report cleanup failures

### Requirement: Core Food CRUD roundtrips are browser-tested
The suite SHALL test authenticated create, update, reload, and delete behavior for Ingredients, Recipes, MealPlans, and ShoppingLists using visible UI assertions plus relevant mutation request assertions.

#### Scenario: Ingredient CRUD roundtrip
- **WHEN** an authenticated user manually creates an Ingredient, changes its description, reloads its detail page, and deletes it
- **THEN** the created name and updated description SHALL persist, the delete confirmation SHALL be shown, and the resource SHALL no longer appear in the list

#### Scenario: Recipe CRUD roundtrip
- **WHEN** an authenticated user creates a manual Recipe, completes the wizard, changes recipe metadata, reloads the detail page, and deletes it
- **THEN** the final title, recipe type, and persisted metadata SHALL be visible after reload and the recipe SHALL disappear after deletion

#### Scenario: MealPlan CRUD roundtrip
- **WHEN** an authenticated user creates a MealPlan with a name, portions, and date range, changes its settings, reloads the detail page, and deletes it
- **THEN** the request payloads and visible plan settings SHALL match the entered values and the plan SHALL disappear after deletion

#### Scenario: ShoppingList CRUD roundtrip
- **WHEN** an authenticated user creates a ShoppingList, adds an item, checks it, renames the list, reloads it, and deletes it
- **THEN** the item checked state, progress, renamed title, and delete result SHALL persist visibly

### Requirement: Recipe creation integrity is deterministic
The suite SHALL cover manual, AI, and enhanced URL-import Recipe creation without live provider calls. Each flow SHALL verify ingredients, metadata, preparation steps, source fields where applicable, and reload persistence.

#### Scenario: Manual recipe saves steps before navigation
- **WHEN** a user edits a preparation step and clicks the wizard's `Weiter` action
- **THEN** exactly one step batch request SHALL contain the edited instruction before the wizard advances

#### Scenario: AI recipe remains editable
- **WHEN** the AI-create endpoint is intercepted with a deterministic draft and the user changes an AI-generated ingredient or preparation step
- **THEN** the manual change SHALL survive completion, query refresh, and detail-page reload without the original AI value being reintroduced

#### Scenario: URL import previews and normalizes servings
- **WHEN** the enhanced URL-import endpoint returns a deterministic recipe for four servings
- **THEN** the preview SHALL show the detected servings, ingredients, and steps, and the create request SHALL normalize quantities exactly once to the backend's one-serving contract

#### Scenario: URL import errors are visible
- **WHEN** the enhanced URL-import endpoint returns invalid URL, unreachable source, unavailable AI, or no-recipe error codes
- **THEN** the UI SHALL show the corresponding German error message and SHALL NOT navigate to or leave behind a partial recipe

### Requirement: Recipe ingredient and serving roundtrips prevent duplication
The suite SHALL verify exact-once ingredient saves, reload persistence, and the configured serving-context normalization for existing and imported recipes.

#### Scenario: Repeated ingredient save clicks are idempotent
- **WHEN** a user clicks the ingredient editor's save action repeatedly while a save is pending
- **THEN** only one logical mutation batch SHALL be submitted and the recipe SHALL contain each ingredient exactly once after reload

#### Scenario: Serving context normalizes once
- **WHEN** a user edits total quantities for four persons and confirms the save normalization
- **THEN** the backend request SHALL contain one-person quantities, reopening for four persons SHALL show the original total quantities, and reopening for one person SHALL show the normalized values

### Requirement: Ingredient warnings and permissions are covered
The suite SHALL verify that generic Ingredient-name warnings are visible but non-blocking and that server-provided `can_edit`/`can_delete` permissions control the UI.

#### Scenario: Generic ingredient warning does not block creation
- **WHEN** an authenticated user enters a configured generic ingredient name
- **THEN** a German warning SHALL be visible, the user SHALL still be able to continue, and the ingredient SHALL be created

#### Scenario: Non-owner cannot edit or delete
- **WHEN** a user opens an Ingredient owned by another user without edit permission
- **THEN** edit and delete controls SHALL not be available and direct navigation to the edit route SHALL not expose an editable form

#### Scenario: Ingredient deletion conflict is visible
- **WHEN** deletion returns a conflict because the Ingredient is referenced by a Recipe
- **THEN** the UI SHALL show the conflict message and SHALL keep the Ingredient visible

### Requirement: MealPlan settings and responsive contracts are covered
The suite SHALL test default meal-time persistence, mobile-first layout behavior, and event-linked manual norm portions.

#### Scenario: Default meal times persist
- **WHEN** a user sets custom breakfast and lunch times in the wizard and creates a MealPlan
- **THEN** the create payload and reopened settings SHALL contain the selected times, and a newly added meal SHALL use the configured defaults

#### Scenario: Time fields fit supported viewports
- **WHEN** the wizard and existing-plan settings are rendered at 320px, tablet, and desktop widths
- **THEN** all time values SHALL be readable, paired start/end fields SHALL remain adjacent, the expected one/two/four group layout SHALL be used, and the document SHALL not overflow horizontally

#### Scenario: Manual event norm portions persist
- **WHEN** a user enables manual norm portions on an event-linked plan, enters a positive whole number, saves, and reloads
- **THEN** the manual mode and value SHALL remain active, participant/activity changes SHALL not replace the value, and disabling the mode SHALL restore automatic calculation

#### Scenario: Invalid manual norm portions are blocked
- **WHEN** a user enters zero, a negative value, or a decimal manual norm-portion value
- **THEN** the save action SHALL be blocked and a German validation message SHALL be shown

### Requirement: Shopping-list permissions and rollback are covered
The suite SHALL verify shopping-list owner, admin, editor, and viewer behavior, optimistic item updates, and visible API failures.

#### Scenario: Viewer cannot mutate a shopping list
- **WHEN** a viewer opens a shared ShoppingList
- **THEN** the viewer SHALL be able to read permitted data but SHALL not be able to add, rename, delete, or check items

#### Scenario: Item check persists and rolls back on failure
- **WHEN** an owner checks an item and the item update succeeds
- **THEN** progress and checked state SHALL update immediately and remain checked after reload
- **WHEN** the same update fails
- **THEN** the UI SHALL roll back the checkbox and show the German error feedback

### Requirement: Cross-resource shopping exports preserve provenance
The suite SHALL verify shopping-list exports from Recipes and MealPlans, including quantities, source references, direct ingredients, and exclusion of reference-meal templates.

#### Scenario: Recipe export creates a persistent list
- **WHEN** a user exports a Recipe for a selected number of portions
- **THEN** the request SHALL contain that portion count and the resulting ShoppingList SHALL contain scaled items with Recipe provenance

#### Scenario: MealPlan export excludes reference meals
- **WHEN** a MealPlan contains real meals and a reference-meal template and the user exports its shopping list
- **THEN** only real meal ingredients SHALL be persisted and each item SHALL retain recipe and meal provenance

### Requirement: URL and viewport regressions are observable
The suite SHALL run required mobile and desktop projects and SHALL verify URL-driven filters/search/pagination for Food list pages.

#### Scenario: URL list state survives reload
- **WHEN** a user searches or filters Ingredients, Recipes, or ShoppingLists and reloads the page
- **THEN** the URL parameters, input values, active filters, and resulting list state SHALL be restored

#### Scenario: Desktop-only and mobile-only controls are correct
- **WHEN** a Food page is rendered at its supported mobile and desktop viewports
- **THEN** mobile action bars and desktop sidebars SHALL appear in their intended contexts without horizontal overflow
