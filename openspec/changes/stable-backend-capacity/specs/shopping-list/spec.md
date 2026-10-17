## ADDED Requirements

### Requirement: Fast shopping list detail
`GET /api/shopping-lists/{id}/` SHALL NOT compute meal-plan quantity plausibility warnings and SHALL NOT include a `warnings` field. The number of database queries of the detail endpoint MUST NOT grow with the number of list entries, meals or recipes of the source meal plan. Access rules are unchanged: members and guests with a valid guest token SHALL receive the list; anonymous users without access SHALL receive the existing error response.

#### Scenario: Meal-plan list with many entries
- **GIVEN** a shopping list generated from a meal plan with many meals, recipes and entries
- **WHEN** an authenticated member opens the list
- **THEN** the response SHALL contain all entries without `warnings`
- **THEN** the query count SHALL equal the query count for the same list with fewer entries

#### Scenario: Guest opens a shared list
- **GIVEN** a guest has joined a shared list
- **WHEN** the guest requests the list with the guest token
- **THEN** the response SHALL contain the entries without `warnings`

#### Scenario: Anonymous user without access
- **WHEN** an unauthenticated user without guest token requests a list
- **THEN** the API SHALL respond with the existing login-required error

### Requirement: Quantity warnings endpoint
`GET /api/shopping-lists/{id}/warnings/` SHALL return the quantity plausibility warnings of the source meal plan as a list (empty for lists not generated from a meal plan or whose meal plan was deleted). The endpoint SHALL use the same access rules as the list detail, SHALL NOT be paginated, and its query count MUST NOT grow per meal or per recipe item. The detail page SHALL load warnings with this endpoint only outside the shopping mode; warnings passed along directly after generating a list MAY be shown without loading.

#### Scenario: Member loads warnings
- **GIVEN** a shopping list generated from a meal plan with an implausible recipe amount
- **WHEN** an authenticated member requests the warnings
- **THEN** the response SHALL contain the warning with ingredient, per-person and total amount

#### Scenario: Manual list
- **GIVEN** a manually created shopping list
- **WHEN** a member requests the warnings
- **THEN** the response SHALL be an empty list

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user without guest token requests the warnings
- **THEN** the API SHALL respond with the existing login-required error

#### Scenario: Shopping mode
- **GIVEN** the detail page is in shopping mode
- **WHEN** the page renders
- **THEN** the warnings endpoint SHALL NOT be requested
