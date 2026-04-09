## MODIFIED Requirements

### Requirement: Pydantic Base Schema
The system SHALL provide base Pydantic schemas (`ContentBaseOut`, `ContentCreateIn`, `ContentUpdateIn`) that all content-type-specific schemas extend. The base output schema SHALL include all shared fields plus computed fields (author_names, tag_names, content_type). The detail output schema SHALL include both `can_edit: bool` and `can_delete: bool` computed permission fields. The list output schema SHALL also include `can_edit: bool` and `can_delete: bool` per item.

#### Scenario: Content type API response (detail)
- **WHEN** any content item is returned via a detail API endpoint
- **THEN** the response SHALL include all `ContentDetailOut` fields plus type-specific fields
- **THEN** the response SHALL include a `content_type` discriminator field (e.g., "session", "recipe", "blog", "game")
- **THEN** the response SHALL include `can_edit: bool` and `can_delete: bool`

#### Scenario: Content type API response (list)
- **WHEN** content items are returned via a list API endpoint
- **THEN** each item SHALL include all `ContentListOut` fields plus type-specific fields
- **THEN** each item SHALL include `can_edit: bool` and `can_delete: bool`

### Requirement: Zod Base Schema
The system SHALL provide a base Zod schema (`ContentBaseSchema`) in the frontend that all content-type-specific Zod schemas extend. The base schema SHALL match the Pydantic `ContentBaseOut` schema 1:1. The detail schema SHALL include `can_edit` and `can_delete` boolean fields. The list item schema SHALL also include `can_edit` and `can_delete` boolean fields.

#### Scenario: Frontend type safety (detail)
- **WHEN** a content detail API response is parsed
- **THEN** the Zod schema SHALL validate all base fields including `can_edit` and `can_delete`
- **THEN** TypeScript types SHALL be inferred from the Zod schema

#### Scenario: Frontend type safety (list)
- **WHEN** a content list API response is parsed
- **THEN** each item SHALL be validated against the Zod schema including `can_edit` and `can_delete`
- **THEN** TypeScript types SHALL be inferred from the Zod schema
