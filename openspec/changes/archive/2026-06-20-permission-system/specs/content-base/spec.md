## MODIFIED Requirements

### Requirement: Soft Delete for all Content
The system SHALL implement soft delete via a `deleted_at` DateTimeField (nullable) on the abstract `Content` model and a `is_deleted` BooleanField (default=False). A custom manager `objects` SHALL filter out soft-deleted records automatically. A secondary manager `all_objects` SHALL return all records including soft-deleted ones.

Draft content SHALL be soft-deletable by its creator. Verified content SHALL only be deletable by staff/admin (hard delete). Soft-deleted content SHALL remain indefinitely; restoration and permanent deletion SHALL be available via Django Admin.

#### Scenario: Creator soft-deletes own draft content
- **WHEN** the creator of a draft content item sends a DELETE request
- **THEN** the `deleted_at` field SHALL be set to the current UTC timestamp
- **THEN** `is_deleted` SHALL be set to `True`
- **THEN** the item SHALL no longer appear in default queries via `objects` manager
- **THEN** the item SHALL still be accessible via `all_objects` manager
- **THEN** HTTP 204 SHALL be returned

#### Scenario: Creator attempts to delete verified content
- **WHEN** the creator of a verified content item sends a DELETE request
- **THEN** the system SHALL return HTTP 403

#### Scenario: Staff hard-deletes content
- **WHEN** a staff user sends a DELETE request for any content
- **THEN** the content SHALL be permanently removed from the database
- **THEN** HTTP 204 SHALL be returned

#### Scenario: Restoring soft-deleted content
- **WHEN** an admin restores a soft-deleted content item via Django Admin
- **THEN** the `deleted_at` field SHALL be set to null and `is_deleted` to `False`
- **THEN** the item SHALL appear in default queries again

### Requirement: Content Approval Status Flow — REMOVED and simplified
The system SHALL replace the multi-step approval workflow (draft → submitted → approved/rejected) with a two-state system (draft → verified). Content SHALL be created as `draft`. Staff and admin users SHALL be able to transition content to `verified` directly. Status values `submitted`, `approved`, `rejected`, and `archived` SHALL be removed.

#### Scenario: Staff sets content to verified
- **WHEN** a staff user sets a content item's status to `verified`
- **THEN** the content SHALL become publicly visible
- **THEN** the creator SHALL lose edit and delete permissions on the content

#### Scenario: Content created as draft
- **WHEN** any user creates content via API
- **THEN** the status SHALL default to `"draft"`

### Requirement: can_delete permission field in API responses — MODIFIED
The system SHALL return a `can_delete` boolean field alongside `can_edit` in all content API responses (both detail and list endpoints). The `can_delete` field SHALL be `true` for staff/admin users on any content, and `true` for the creator on their own draft content. It SHALL be `false` for creators on verified content and for all other users.

#### Scenario: Staff user views content detail
- **WHEN** a staff user requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: true` and `can_delete: true`

#### Scenario: Author views own draft content
- **WHEN** the creator of a draft content item requests the content detail endpoint
- **THEN** the response SHALL include `can_edit: true` and `can_delete: true`

#### Scenario: Author views own verified content
- **WHEN** the creator of a verified content item requests the content detail endpoint
- **THEN** the response SHALL include `can_edit: false` and `can_delete: false`

#### Scenario: Anonymous user views content detail
- **WHEN** an unauthenticated user requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: false` and `can_delete: false`

### Requirement: Consistent delete permission across content types — MODIFIED
The system SHALL enforce the following delete permissions for all content types:
- Creator SHALL soft-delete their own content when status is `draft`.
- Staff and admin SHALL hard-delete any content regardless of status.
- Creator SHALL NOT delete verified content.

#### Scenario: Creator soft-deletes own draft
- **WHEN** a non-staff creator sends a DELETE request for their own draft content
- **THEN** the system SHALL soft-delete the content (set `deleted_at`)
- **THEN** the system SHALL return HTTP 204

#### Scenario: Creator attempts to delete verified content
- **WHEN** a non-staff creator sends a DELETE request for their own verified content
- **THEN** the system SHALL return HTTP 403

#### Scenario: Staff hard-deletes content
- **WHEN** a staff user sends a DELETE request for any content
- **THEN** the content SHALL be permanently removed
- **THEN** HTTP 204 SHALL be returned

## REMOVED Requirements

### Requirement: Content Approval Status Flow (full submission workflow)
**Reason**: Replaced by simplified two-state system (draft/verified). The submission/rejection workflow with email notifications and approval logs is removed.
**Migration**: All `submitted`, `approved` content → `verified`. All `rejected`, `archived` → `draft`. ApprovalLog data retained for audit.

### Requirement: Permission fields in list responses (old staff-only delete rule)
**Reason**: `can_delete` logic changed from "staff-only" to "staff OR (creator AND draft)".
**Migration**: API helpers updated to compute new logic. No data migration needed.
