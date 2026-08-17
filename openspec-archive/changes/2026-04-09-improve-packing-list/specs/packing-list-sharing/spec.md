## ADDED Requirements

### Requirement: Packing list visibility control
Each PackingList SHALL have a `visibility` field controlling who can view the list. The system SHALL support `private` and `link_only` visibility modes.

#### Scenario: Creating a packing list with default visibility
- **WHEN** a user creates a new packing list without specifying visibility
- **THEN** the list SHALL be created with `visibility="link_only"`

#### Scenario: Private packing list access
- **WHEN** a packing list has `visibility="private"`
- **THEN** only the owner, group admins, and staff SHALL be able to view the list via `GET /api/packing-lists/{id}/`
- **THEN** unauthenticated users or non-authorized users SHALL receive a 404 response

#### Scenario: Link-only packing list access
- **WHEN** a packing list has `visibility="link_only"`
- **THEN** anyone with the URL SHALL be able to view the list (read-only)
- **THEN** this SHALL match the current behavior

#### Scenario: Template visibility override
- **WHEN** a packing list has `is_template=True`
- **THEN** the list SHALL always be publicly accessible regardless of `visibility` setting

#### Scenario: Changing visibility
- **WHEN** a user with edit permission updates the `visibility` field via PATCH
- **THEN** the visibility change SHALL take effect immediately
- **THEN** existing share links SHALL continue to work regardless of visibility setting

#### Scenario: Visibility in list view
- **WHEN** a user views their packing lists on the list page
- **THEN** each list card SHALL display the current visibility mode (icon or label)
- **THEN** a toggle or dropdown SHALL allow changing visibility inline

### Requirement: Share links with unique check state
The system SHALL support creating share links for packing lists. Each share link SHALL have a UUID token and its own independent check state per item.

#### Scenario: Creating a share link
- **WHEN** a user with edit permission creates a share link via `POST /api/packing-lists/{id}/shares/`
- **THEN** the system SHALL generate a unique UUID token
- **THEN** the share link URL SHALL be `/packing-lists/shared/{token}`
- **THEN** the user MAY provide a label (e.g., "Für Max") for the share link

#### Scenario: Listing share links
- **WHEN** a user with edit permission requests `GET /api/packing-lists/{id}/shares/`
- **THEN** the system SHALL return all active share links for this packing list
- **THEN** each share link SHALL include token, label, created_at, and is_active

#### Scenario: Deactivating a share link
- **WHEN** a user with edit permission sends `DELETE /api/packing-lists/{id}/shares/{share_id}/`
- **THEN** the share link SHALL be marked as `is_active=False`
- **THEN** the share link SHALL no longer be accessible to visitors

#### Scenario: Viewing a packing list via share link
- **WHEN** a visitor opens `/packing-lists/shared/{token}`
- **THEN** the system SHALL load the packing list via `GET /api/packing-lists/shared/{token}/`
- **THEN** the list SHALL be displayed in a simplified read-only view
- **THEN** "Nicht mitbringen" items SHALL be visible but not checkable
- **THEN** no login SHALL be required

#### Scenario: Checking items on a share link
- **WHEN** a visitor checks/unchecks an item on a share link page
- **THEN** the system SHALL persist the check state via `PATCH /api/packing-lists/shared/{token}/checks/`
- **THEN** the check state SHALL be stored in `PackingListShareCheck` (per share, per item)
- **THEN** the original `PackingItem.is_checked` SHALL NOT be modified

#### Scenario: Share link progress
- **WHEN** a visitor views a packing list via share link
- **THEN** the progress bar SHALL reflect the share-specific check state
- **THEN** "Nicht mitbringen" items SHALL NOT count toward progress

#### Scenario: Accessing inactive share link
- **WHEN** a visitor tries to access a share link with `is_active=False`
- **THEN** the system SHALL return a 404 response
- **THEN** the frontend SHALL display a "Dieser Link ist nicht mehr gültig" message

#### Scenario: Share link with newly added items
- **WHEN** the owner adds new items to a packing list after a share link was created
- **THEN** the new items SHALL appear in the share link view
- **THEN** the new items SHALL have `is_checked=False` in the share-specific state (no PackingListShareCheck row exists yet)

#### Scenario: Share link management UI
- **WHEN** a user with edit permission views a packing list detail page
- **THEN** a "Teilen" section SHALL display existing share links
- **THEN** each share link SHALL show its label, a copy-link button, and a deactivate button
- **THEN** a "Neuen Link erstellen" button SHALL allow creating additional share links
