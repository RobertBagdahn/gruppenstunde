# recipe-creation-roundtrip-integrity Specification

## Purpose
Ensure end-to-end data persistence, state isolation, and reload integrity across all recipe creation flows (manual, AI, URL import) and wizard steps.

## Requirements

### Requirement: Wizard step changes preserve active edits
The recipe wizard SHALL persist all edits belonging to the active step before navigating forward. Navigation SHALL wait for the save operation to succeed, and a failed save SHALL keep the user on the current step with a German error message.

#### Scenario: Preparation edits persist when advancing
- **WHEN** an authenticated user edits a preparation step and clicks "Weiter"
- **THEN** the wizard SHALL call `PUT /api/recipes/{slug}/steps/batch` with the current edited steps before changing the active step
- **THEN** the edited preparation text SHALL be present after returning to the step or reloading the recipe

#### Scenario: Failed step save blocks navigation
- **WHEN** the step batch request fails
- **THEN** the wizard SHALL remain on the preparation step
- **THEN** the user SHALL see a German error message and be able to retry

#### Scenario: Clean step query refresh does not lose saved data
- **WHEN** the step query refetches after a successful save
- **THEN** the editor SHALL display the server-confirmed steps
- **THEN** the editor SHALL not submit or display an older pre-edit version

### Requirement: Step editor state is isolated by recipe and dirty state
The frontend step editor SHALL associate local Zustand state with the active recipe slug and SHALL not hydrate server data over unsaved local changes. A successful batch save SHALL clear the dirty state only after the API response succeeds.

#### Scenario: Switching recipes does not reuse steps
- **WHEN** an authenticated user opens a different recipe in the step editor
- **THEN** the editor SHALL show only the second recipe's steps
- **THEN** no step from the first recipe SHALL be submitted for the second recipe

#### Scenario: Unsaved edit survives a query update
- **WHEN** a user edits a step locally and the step query receives a background update before saving
- **THEN** the local edit SHALL remain visible
- **THEN** the editor SHALL continue to report unsaved changes

### Requirement: Ingredient save actions are single-application
One ingredient-editor save action SHALL apply its additions, updates, and deletions at most once. The save control SHALL prevent concurrent submissions, and successful completion SHALL refresh the authoritative recipe and ingredient state exactly once for the action.

#### Scenario: Multiple new ingredients remain unique
- **WHEN** a user adds multiple distinct ingredients and saves once
- **THEN** each selected ingredient SHALL result in exactly one RecipeItem
- **THEN** reloading the recipe SHALL show each ingredient exactly once

#### Scenario: Repeated save click does not duplicate items
- **WHEN** a user clicks the ingredient save control repeatedly while the first save is pending
- **THEN** only one save operation SHALL be applied
- **THEN** no duplicate RecipeItem SHALL be created

#### Scenario: Ingredient save failure is retryable
- **WHEN** an ingredient mutation fails
- **THEN** the editor SHALL show a German error message
- **THEN** the user SHALL be able to retry without replaying already successful operations

### Requirement: AI-created recipe data remains editable
The AI creation flow SHALL create a draft containing the returned recipe metadata and ingredients, and the wizard SHALL preserve subsequent manual changes to title, ingredients, metadata, and preparation steps.

#### Scenario: AI draft enters the ingredient step
- **WHEN** an authenticated user successfully submits a prompt to `POST /api/recipes/ai-create/`
- **THEN** the response SHALL create a `draft` recipe with the returned recipe items
- **THEN** the wizard SHALL display those items in Step 1

#### Scenario: AI draft manual edits survive completion
- **WHEN** the user changes an AI-generated ingredient and preparation instruction and completes the wizard
- **THEN** the changed values SHALL be persisted
- **THEN** reopening the recipe SHALL not restore the original AI values

### Requirement: URL import uses one complete preview contract
User-facing recipe URL import SHALL use `POST /api/recipes/import-from-url-enhanced/` and SHALL return a validated preview containing the detected servings, recipe metadata, steps, matched recipe items, and created-ingredient information. The frontend Zod schema and backend Pydantic schema SHALL describe the same fields and nullability.

#### Scenario: Structured Chefkoch recipe imports successfully
- **WHEN** an authenticated user submits a supported Chefkoch fixture containing schema.org Recipe JSON-LD
- **THEN** the import SHALL return HTTP 200
- **THEN** the preview SHALL include title, servings, ingredients with portion IDs, preparation steps, and source URL

#### Scenario: Import quantities use servings
- **WHEN** the preview reports `recipe_draft.servings` greater than one and the user confirms import
- **THEN** the recipe item quantities SHALL be normalized using that servings value
- **THEN** the created draft SHALL store one base portion

#### Scenario: Import with no recipe data fails clearly
- **WHEN** an authenticated user submits a reachable page without recognizable recipe data
- **THEN** the endpoint SHALL return HTTP 422 with the no-recipe error code
- **THEN** the UI SHALL show a German recovery message without a blank screen

#### Scenario: Blocked source fails clearly
- **WHEN** the source cannot be fetched or rejects the request
- **THEN** the endpoint SHALL return the classified source-unreachable error
- **THEN** the user SHALL be told to check the URL or enter the recipe manually

### Requirement: URL-imported preparation steps are durable
The URL import flow SHALL carry returned preparation steps into the created recipe and SHALL save them before the wizard advances.

#### Scenario: Imported steps appear after recipe creation
- **WHEN** a user confirms a URL preview containing preparation steps
- **THEN** the created draft SHALL contain those steps
- **THEN** the preparation step SHALL display them in the step editor

#### Scenario: Imported steps can be manually changed
- **WHEN** the user edits an imported preparation step and advances or reloads
- **THEN** the edited instruction SHALL remain persisted
- **THEN** the original imported instruction SHALL not overwrite it

### Requirement: Recipe creation flows have deterministic end-to-end coverage
The Playwright suite SHALL cover the critical recipe creation round trips using deterministic API fixtures or intercepted external requests. Tests SHALL not ignore errors from the flow under test.

#### Scenario: Wizard workflow regression suite
- **WHEN** the recipe workflow Playwright tests run
- **THEN** they SHALL cover AI creation, manual ingredient persistence, preparation editing, URL preview/import, and reload verification
- **THEN** failures from recipe, import, ingredient, or step APIs SHALL fail the relevant test

#### Scenario: Mobile recipe creation remains usable
- **WHEN** the wizard is tested at a viewport width of 320px
- **THEN** the creation methods, active editor, and navigation controls SHALL remain usable without horizontal overflow
