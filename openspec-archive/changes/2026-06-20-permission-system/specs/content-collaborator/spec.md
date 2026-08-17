## ADDED Requirements

### Requirement: ContentCollaborator Model
The system SHALL provide a `ContentCollaborator` model with `GenericForeignKey` for sharing any model instance with users or groups. Fields: `content_type` (FK to ContentType), `object_id` (PositiveIntegerField), `user` (FK to User, nullable), `group` (FK to UserGroup, nullable), `role` (CharField, choices: viewer/editor/admin), `created_by` (FK to User), `created_at` (DateTimeField). A CheckConstraint SHALL enforce that at least one of `user` or `group` is set. A UniqueConstraint SHALL enforce uniqueness on (`content_type`, `object_id`, `user`, `group`).

#### Scenario: Create collaborator for user
- **WHEN** a share is created with `user=some_user` and `role="editor"`
- **THEN** the ContentCollaborator SHALL be persisted

#### Scenario: Create collaborator for group
- **WHEN** a share is created with `group=some_group` and `role="viewer"`
- **THEN** the ContentCollaborator SHALL be persisted

#### Scenario: Both user and group null rejected
- **WHEN** a share is attempted with both `user=None` and `group=None`
- **THEN** the database SHALL reject the insert with a constraint violation

#### Scenario: Duplicate share rejected
- **WHEN** a share is attempted for the same (content, user, group) that already exists
- **THEN** the database SHALL reject the insert with a unique constraint violation

### Requirement: Collaborator role permissions
The system SHALL enforce the following permissions based on collaborator role:
- `viewer`: SHALL be able to see the shared content (even if draft). SHALL NOT be able to edit or manage shares.
- `editor`: SHALL be able to see and edit the shared content (when draft). SHALL NOT be able to manage shares.
- `admin`: SHALL be able to see, edit, and manage shares for the shared content.

#### Scenario: Viewer sees shared draft content
- **WHEN** a viewer requests a shared draft content item via API
- **THEN** the content SHALL be returned in list and detail endpoints
- **THEN** `can_edit` SHALL be `false` and `can_delete` SHALL be `false`

#### Scenario: Editor edits shared draft content
- **WHEN** an editor sends `PATCH` on a shared draft content item
- **THEN** the update SHALL succeed
- **THEN** `can_edit` SHALL be `true`

#### Scenario: Admin adds another collaborator
- **WHEN** a shared admin sends `POST /api/content-collaborators/` for the same content
- **THEN** the new collaborator SHALL be created

#### Scenario: Editor cannot manage shares
- **WHEN** a shared editor attempts to add or remove collaborators on the shared content
- **THEN** the system SHALL return HTTP 403

### Requirement: Collaborator visibility is irrelevant for verified content
When content status is `verified`, collaborator-based visibility SHALL NOT apply — verified content is already visible to everyone. Collaborator edit rights on verified content SHALL be revoked (only staff/admin can edit verified content).

#### Scenario: Shared editor on verified content cannot edit
- **WHEN** content is verified and a shared editor attempts to edit it
- **THEN** the system SHALL return HTTP 403

#### Scenario: Shared viewer still sees verified content
- **WHEN** content is verified and a shared viewer requests it
- **THEN** the content SHALL be returned (it is publicly visible anyway)

### Requirement: Group-based sharing
ContentCollaborator SHALL support sharing with entire `UserGroup` instances. Any visible group SHALL be selectable as a share target. Group membership SHALL be resolved at query time: any active member of the group SHALL receive the specified role on the shared content.

#### Scenario: Share with a group
- **WHEN** a creator shares draft content with a group as `role="viewer"`
- **THEN** all active members of that group SHALL be able to see the content in their list views

#### Scenario: Group membership changes
- **WHEN** a new user joins a group that has been shared content
- **THEN** the new member SHALL immediately gain access to the shared content

#### Scenario: User leaves group
- **WHEN** a user leaves a group that had been shared content
- **THEN** the user SHALL lose access to content shared only via that group (unless they have direct shares)

### Requirement: Share management authorization
The system SHALL allow the following users to manage shares (add, update role, remove):
- The content creator (`created_by`)
- Users with ContentCollaborator role `admin` on the specific content
- Staff and admin users (`role` in `["staff", "admin"]`)

#### Scenario: Creator adds a share
- **WHEN** the content creator sends `POST /api/content-collaborators/` with `content_type`, `object_id`, `user_id`, and `role`
- **THEN** a ContentCollaborator SHALL be created

#### Scenario: Shared admin adds another share
- **WHEN** a user with ContentCollaborator `role="admin"` sends `POST /api/content-collaborators/`
- **THEN** the new share SHALL be created

#### Scenario: Shared editor attempts to add share
- **WHEN** a user with ContentCollaborator `role="editor"` sends `POST /api/content-collaborators/`
- **THEN** the system SHALL return HTTP 403

### Requirement: ContentCollaborator API endpoints
The system SHALL provide CRUD endpoints for ContentCollaborator at `/api/content-collaborators/`:
- `GET /api/content-collaborators/?content_type={app_label.model}&object_id={id}` — list collaborators for a content item
- `POST /api/content-collaborators/` — add a collaborator (requires share-management authorization)
- `PATCH /api/content-collaborators/{id}/` — update role (requires share-management authorization)
- `DELETE /api/content-collaborators/{id}/` — remove collaborator (requires share-management authorization)

#### Scenario: List collaborators for content
- **WHEN** an authenticated user with access sends `GET /api/content-collaborators/?content_type=recipe.recipe&object_id=42`
- **THEN** all ContentCollaborator entries for that content SHALL be returned with `user`, `group`, `role`, `created_by`, `created_at`

#### Scenario: PATCH role update
- **WHEN** an authorized user sends `PATCH /api/content-collaborators/{id}/` with `{ "role": "admin" }`
- **THEN** the collaborator's role SHALL be updated

#### Scenario: DELETE collaborator
- **WHEN** an authorized user sends `DELETE /api/content-collaborators/{id}/`
- **THEN** the ContentCollaborator SHALL be removed
- **THEN** the removed user/group SHALL lose access (unless they have access via other means)

### Requirement: Migration of existing collaborator models
The system SHALL migrate existing collaborator data from `MealPlanCollaborator`, ShoppingList collaborators, and `PlannerCollaborator` into `ContentCollaborator` during deployment. The source tables SHALL be dropped after migration. API endpoints for meal plan, shopping list, and planner collaborators SHALL be updated to use ContentCollaborator.

#### Scenario: MealPlanCollaborator migrated
- **WHEN** the migration runs
- **THEN** every `MealPlanCollaborator` row SHALL become a `ContentCollaborator` row with `content_type` pointing to `planner.MealPlan` and `object_id` set to the meal plan's primary key

#### Scenario: PlannerCollaborator migrated
- **WHEN** the migration runs
- **THEN** every `PlannerCollaborator` row SHALL become a `ContentCollaborator` row with `content_type` pointing to `planner.Planner`

#### Scenario: ShoppingList collaborator migrated
- **WHEN** the migration runs
- **THEN** every shopping list collaborator SHALL become a `ContentCollaborator` row with `content_type` pointing to `shopping.ShoppingList`
