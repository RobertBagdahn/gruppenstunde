## ADDED Requirements

### Requirement: can_delete permission field in API responses
The system SHALL return a `can_delete` boolean field alongside `can_edit` in all content API responses (both detail and list endpoints). The `can_delete` field SHALL be `true` when the authenticated user is staff (`is_staff=True`), and `false` otherwise.

#### Scenario: Staff user views content detail
- **WHEN** a staff user (`is_staff=True`) requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: true` and `can_delete: true`

#### Scenario: Author views own content detail
- **WHEN** an author of the content requests the content detail endpoint
- **THEN** the response SHALL include `can_edit: true` and `can_delete: false`

#### Scenario: Anonymous user views content detail
- **WHEN** an unauthenticated user requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: false` and `can_delete: false`

#### Scenario: Regular authenticated user views content detail
- **WHEN** an authenticated non-staff, non-author user requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: false` and `can_delete: false`

### Requirement: Permission fields in list responses
The system SHALL include `can_edit` and `can_delete` boolean fields on each item in paginated content list responses for all content types (Session, Blog, Game, Recipe).

#### Scenario: Staff user views content list
- **WHEN** a staff user requests a content list endpoint
- **THEN** every item in the `items` array SHALL include `can_edit: true` and `can_delete: true`

#### Scenario: Author views content list containing own items
- **WHEN** an author requests a content list endpoint
- **THEN** items authored by the user SHALL include `can_edit: true` and `can_delete: false`
- **THEN** items not authored by the user SHALL include `can_edit: false` and `can_delete: false`

#### Scenario: Anonymous user views content list
- **WHEN** an unauthenticated user requests a content list endpoint
- **THEN** every item SHALL include `can_edit: false` and `can_delete: false`

### Requirement: Consistent delete permission across content types
The system SHALL enforce staff-only (`is_staff=True`) delete permission for all content types (Session, Blog, Game, Recipe). Non-staff users, including content authors, SHALL NOT be able to delete content via the API.

#### Scenario: Staff deletes any content
- **WHEN** a staff user sends a DELETE request for any content type
- **THEN** the system SHALL soft-delete the content (set `deleted_at`)
- **THEN** the system SHALL return HTTP 204

#### Scenario: Author attempts to delete own content
- **WHEN** a non-staff author sends a DELETE request for their own content
- **THEN** the system SHALL return HTTP 403

#### Scenario: Anonymous user attempts to delete content
- **WHEN** an unauthenticated user sends a DELETE request for any content
- **THEN** the system SHALL return HTTP 403

### Requirement: Delete button on content detail pages
The frontend SHALL display a delete button on all content detail pages (Session, Blog, Game, Recipe) when `can_delete` is `true` in the API response.

#### Scenario: Staff user sees delete button
- **WHEN** a staff user views a content detail page
- **THEN** a delete button (trash icon) SHALL be visible in the page header area
- **THEN** clicking the delete button SHALL open a confirmation dialog

#### Scenario: Confirmation dialog before delete
- **WHEN** a user clicks the delete button on a content detail page
- **THEN** a `ConfirmDialog` SHALL appear with a warning message in German
- **THEN** confirming SHALL call the DELETE API endpoint
- **THEN** on success, the user SHALL be redirected to the content list page with a success toast
- **THEN** on error, an error toast SHALL be shown

#### Scenario: Non-staff user does not see delete button
- **WHEN** a non-staff user views a content detail page
- **THEN** no delete button SHALL be displayed

### Requirement: Edit and delete icons on content cards
The frontend SHALL display edit (pencil) and delete (trash) icon buttons on `ContentCard` and `RecipeCard` components when the user has the respective permissions.

#### Scenario: Staff user sees action icons on content cards
- **WHEN** a staff user views a content list page
- **THEN** each content card SHALL display edit and delete icon buttons
- **THEN** on desktop, the icons SHALL appear on hover
- **THEN** on mobile, the icons SHALL always be visible

#### Scenario: Edit icon navigates to edit page
- **WHEN** a user clicks the edit icon on a content card
- **THEN** the user SHALL be navigated to the content detail page (where inline editing is available)

#### Scenario: Delete icon triggers confirmation
- **WHEN** a user clicks the delete icon on a content card
- **THEN** a `ConfirmDialog` SHALL appear
- **THEN** confirming SHALL call the DELETE API endpoint
- **THEN** on success, the card SHALL be removed from the list (query invalidation)
- **THEN** on success, a success toast SHALL be shown

#### Scenario: Non-authorized user does not see action icons
- **WHEN** a user without edit/delete permissions views a content list page
- **THEN** no action icons SHALL be displayed on the content cards
