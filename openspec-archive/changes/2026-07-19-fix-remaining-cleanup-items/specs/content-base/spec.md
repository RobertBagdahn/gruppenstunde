## ADDED Requirements

### Requirement: Content has optional costs_per_person field
The abstract `Content` model SHALL include an optional `costs_per_person` field of type `DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)` representing the cost per participant in Euros.

#### Scenario: Content created without costs
- **WHEN** a new Content instance is created without specifying `costs_per_person`
- **THEN** the field SHALL default to `None` (not 0)

#### Scenario: Content created with costs
- **WHEN** a new Content instance is created with `costs_per_person=2.50`
- **THEN** the value SHALL be persisted and returned in API responses

#### Scenario: Costs displayed in API
- **WHEN** Content is serialized via `ContentListOut` or `ContentDetailOut`
- **THEN** the response SHALL include `costs_per_person` as a nullable decimal number

#### Scenario: Zod schema synchronized
- **WHEN** the Pydantic schema is updated with `costs_per_person`
- **THEN** the corresponding Zod schema in both `frontend/` and `frontend-food/` SHALL include `costs_per_person: z.number().nullable().optional()`
