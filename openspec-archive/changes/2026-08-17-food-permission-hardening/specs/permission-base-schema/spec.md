## MODIFIED Requirements

### Requirement: HasPermissions Pydantic mixin
The system SHALL provide a Pydantic `HasPermissions` mixin in `backend/core/schemas.py` with the fields `can_edit: bool` and `can_delete: bool`. Any resource schema (detail or list) that exposes editable content SHALL include these fields, either by inheriting from the mixin or by declaring them directly. Food resource permission values SHALL be resolved by the central Food access policy.

#### Scenario: Mixin usage in a schema
- **WHEN** a developer creates a new resource schema
- **THEN** they SHALL be able to inherit from `HasPermissions` to include `can_edit` and `can_delete` fields

#### Scenario: Content schemas remain compatible
- **WHEN** `ContentListOut` and `ContentDetailOut` in `content/schemas/base.py` define `can_edit` and `can_delete`
- **THEN** they SHALL remain independent of the new mixin

### Requirement: Zod permissionBaseSchema
The system SHALL provide a Zod `permissionBaseSchema` in `frontend-food/src/schemas/base.ts` with the fields `can_edit: z.boolean()` and `can_delete: z.boolean()`. Food resource schemas SHALL use `.merge(permissionBaseSchema)` or `.extend()` to include these fields strictly.

#### Scenario: Zod schema uses permission base
- **WHEN** a developer creates a new resource Zod schema
- **THEN** they SHALL be able to merge `permissionBaseSchema` to include these fields

#### Scenario: Missing fields fail validation
- **WHEN** the frontend validates a Food response without `can_edit` or `can_delete`
- **THEN** Zod validation SHALL fail

### Requirement: Every resource detail and list schema exposes permission fields
All Food resource schemas (ingredients, materials, shopping lists, meal plans, ref meals, recipes) SHALL expose `can_edit: bool` and `can_delete: bool` on both detail and list response schemas. Values SHALL be resolved server-side using the central Food policy.

#### Scenario: Authenticated owner views resource
- **WHEN** the owner requests the detail endpoint
- **THEN** `can_edit` SHALL be `true` and `can_delete` SHALL reflect the owner's delete permission

#### Scenario: Authenticated non-owner views resource
- **WHEN** a non-staff user without edit access requests a visible resource
- **THEN** `can_edit` SHALL be `false` and `can_delete` SHALL be `false`

#### Scenario: Staff views any resource
- **WHEN** a staff user requests any Food resource detail endpoint
- **THEN** `can_edit` and `can_delete` SHALL be `true`

#### Scenario: Unauthenticated user views public resource
- **WHEN** an unauthenticated user views a public resource
- **THEN** `can_edit` and `can_delete` SHALL be `false`

### Requirement: Frontend uses server-provided permissions exclusively
The frontend SHALL determine edit permissions exclusively from `can_edit` and `can_delete` fields in API responses. It SHALL NOT compute permissions by comparing user IDs or checking staff status client-side.

#### Scenario: Ingredient detail page determines editability
- **WHEN** the ingredient detail page renders
- **THEN** it SHALL use `ingredient.can_edit` and `ingredient.can_delete` from the API response

#### Scenario: No client-side permission computation
- **WHEN** a frontend component needs to know if a user can edit a resource
- **THEN** it SHALL use the server-provided permission fields
