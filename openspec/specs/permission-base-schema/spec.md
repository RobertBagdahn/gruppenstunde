# permission-base-schema Specification

## Purpose
TBD - created by archiving change permission-guarded-edit-controls. Update Purpose after archive.
## Requirements
### Requirement: HasPermissions Pydantic mixin
The system SHALL provide a Pydantic `HasPermissions` mixin in `backend/core/schemas.py` with the fields `can_edit: bool` and `can_delete: bool`. Any resource schema (detail or list) that exposes editable content SHALL include these fields, either by inheriting from the mixin or by declaring them directly.

#### Scenario: Mixin usage in a schema
- **WHEN** a developer creates a new resource schema
- **THEN** they SHALL be able to inherit from `HasPermissions` to include `can_edit` and `can_delete` fields

#### Scenario: Content schemas remain compatible
- **WHEN** `ContentListOut` and `ContentDetailOut` in `content/schemas/base.py` define `can_edit` and `can_delete`
- **THEN** they SHALL remain independent of the new mixin (backward-compatible with existing Content-type schemas)

### Requirement: Zod permissionBaseSchema
The system SHALL provide a Zod `permissionBaseSchema` in `frontend-food/src/schemas/base.ts` with the fields `can_edit: z.boolean()` and `can_delete: z.boolean()`. Resource schemas SHALL use `.merge(permissionBaseSchema)` or `.extend()` to include these fields.

#### Scenario: Zod schema uses permission base
- **WHEN** a developer creates a new resource Zod schema
- **THEN** they SHALL be able to merge `permissionBaseSchema` to include `can_edit` and `can_delete`

#### Scenario: Types are derived correctly
- **WHEN** a schema extends or merges `permissionBaseSchema`
- **THEN** the resulting TypeScript type SHALL include `can_edit: boolean` and `can_delete: boolean`

### Requirement: Every resource detail and list schema exposes permission fields
All food resource schemas (ingredients, materials, shopping lists, meal plans, ref meals, recipes) SHALL expose `can_edit: bool` and `can_delete: bool` on both detail and list response schemas. The values SHALL be resolved server-side using each resource's permission logic.

#### Scenario: Authenticated owner views their resource
- **WHEN** the owner of a resource requests the detail endpoint
- **THEN** `can_edit` SHALL be `true` and `can_delete` SHALL be `true`

#### Scenario: Authenticated non-owner views another's resource
- **WHEN** a non-staff user who is not the owner requests the detail endpoint
- **THEN** `can_edit` SHALL be `false` and `can_delete` SHALL be `false`

#### Scenario: Staff views any resource
- **WHEN** a staff user requests any resource detail endpoint
- **THEN** `can_edit` SHALL be `true` and `can_delete` SHALL be `true`

#### Scenario: Unauthenticated user views resource
- **WHEN** an unauthenticated request hits a detail endpoint
- **THEN** `can_edit` SHALL be `false` and `can_delete` SHALL be `false`

### Requirement: Frontend uses server-provided permissions exclusively
The frontend SHALL determine edit permissions exclusively from `can_edit` and `can_delete` fields in API responses. The frontend SHALL NOT compute edit permissions by comparing user IDs or checking staff status client-side.

#### Scenario: Ingredient detail page determines editability
- **WHEN** the ingredient detail page renders
- **THEN** it SHALL use `ingredient.can_edit` and `ingredient.can_delete` from the API response

#### Scenario: No client-side permission computation
- **WHEN** any frontend component needs to know if the user can edit a resource
- **THEN** it SHALL NOT compare `user.id === resource.created_by_id` or check `user.is_staff`
- **THEN** it SHALL use `resource.can_edit` and `resource.can_delete` from the API response

