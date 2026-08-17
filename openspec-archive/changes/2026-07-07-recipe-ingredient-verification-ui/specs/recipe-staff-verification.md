## ADDED Requirements

### Requirement: Staff can set recipe status directly in editor
The system SHALL allow staff users (is_staff=true) to set a recipe's approval status directly from the recipe edit form without navigating to a separate admin panel.

#### Scenario: Staff sets recipe to approved
- **WHEN** a staff member opens the recipe editor
- **THEN** an "Admin Controls" section appears with a status dropdown
- **WHEN** the staff member selects "approved" from the dropdown and clicks "Save"
- **THEN** the recipe status changes to "approved" and the page reloads showing the updated status

#### Scenario: Non-staff user sees no status control
- **WHEN** a non-staff user opens the recipe editor
- **THEN** the "Admin Controls" section is completely hidden
- **AND** the form does not contain a status field

#### Scenario: Status change validation
- **WHEN** a staff member attempts to set an invalid status value (e.g., "invalid_status")
- **THEN** the backend rejects the request with a 400 error
- **AND** the frontend displays an error message to the user

### Requirement: Staff can manage recipe source_url and authors
The system SHALL allow staff to edit recipe metadata fields (source_url, authors) from the recipe edit form.

#### Scenario: Staff adds source URL
- **WHEN** a staff member opens the recipe editor
- **THEN** the "Admin Controls" section contains a "Source URL" text input field
- **WHEN** the staff member enters a URL and saves the recipe
- **THEN** the recipe.source_url field is updated and persists

#### Scenario: Staff manages recipe authors/collaborators
- **WHEN** a staff member opens the recipe editor
- **THEN** the "Admin Controls" section contains an "Authors / Collaborators" multi-select field
- **WHEN** the staff member adds or removes authors and saves
- **THEN** the recipe.authors M2M relationship is updated correctly

#### Scenario: Non-staff cannot modify metadata
- **WHEN** a non-staff user attempts to directly modify source_url or authors via API
- **THEN** the backend rejects with a 403 error
- **AND** the recipe metadata remains unchanged

---

## ADDED Requirements (Capability: ingredient-inline-verification)

### Requirement: Staff can verify ingredients inline from recipe editor
The system SHALL allow staff users to mark ingredients as "verified" directly from the InlineIngredientEditor without navigating away from the recipe.

#### Scenario: Staff clicks verify button on an ingredient
- **WHEN** a staff member views a recipe editor with ingredients
- **THEN** a "Verify" action button appears next to each ingredient (in an actions menu or inline)
- **WHEN** the staff member clicks the "Verify" button
- **THEN** the ingredient status is immediately updated to "verified" via API call
- **AND** the button changes to show "Verified" state with appropriate styling

#### Scenario: Non-staff sees no verify button
- **WHEN** a non-staff user views the recipe ingredients
- **THEN** the "Verify" button is not displayed for any ingredient

#### Scenario: Verify button is disabled while request is in flight
- **WHEN** a staff member clicks the "Verify" button on an ingredient
- **THEN** the button becomes disabled (loading state)
- **AND** a loading spinner appears
- **WHEN** the API request completes
- **THEN** the button re-enables and shows "Verified" state

#### Scenario: Error handling when verification fails
- **WHEN** the ingredient verification API call fails (e.g., 500 error)
- **THEN** the button returns to normal state
- **AND** an error toast notification is displayed to the user

---

## MODIFIED Requirements (Capability: recipe-approval-workflow)

### Requirement: Only staff can modify recipe status
The system SHALL enforce that only staff members (is_staff=true) can modify the recipe.status field. Non-staff users attempting to set status via API SHALL receive a 403 Forbidden error.

#### Scenario: Staff successfully updates recipe status
- **WHEN** an authenticated staff user submits a PATCH request to `/recipes/{recipe_id}/` with `{status: "approved"}`
- **THEN** the request succeeds (200 OK)
- **AND** the recipe.status is updated to "approved"

#### Scenario: Non-staff user is blocked from setting status
- **WHEN** an authenticated non-staff user submits a PATCH request to `/recipes/{recipe_id}/` with `{status: "approved"}`
- **THEN** the request fails with 403 Forbidden
- **AND** the response body contains an error message like "Only admins can set recipe status"
- **AND** the recipe.status remains unchanged

#### Scenario: Unauthenticated user is blocked
- **WHEN** an unauthenticated user submits a PATCH request with status field
- **THEN** the request fails with 401 Unauthorized (or 403, depending on auth flow)
- **AND** the recipe is not modified

#### Scenario: Status changes are protected per-field, other fields can be modified by recipe owner
- **WHEN** a non-staff recipe owner submits a PATCH request with `{title: "New Title", status: "approved"}`
- **THEN** the request fails with 403 (because of status field)
- **AND** no part of the request is applied (atomic: all-or-nothing)
- **AND** the recipe remains unchanged
