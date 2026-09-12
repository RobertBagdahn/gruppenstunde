## MODIFIED Requirements

### Requirement: Public food profile shows only public resources
The public food profile SHALL only expose recipes that are `public` and approved, shopping lists that the profile owner has made publicly accessible, and meal plans that are visible to the requesting user. Private shopping lists and private meal plans SHALL NOT be returned.

#### Scenario: Public profile filters private lists
- **WHEN** a viewer requests a user's public food profile
- **THEN** the response SHALL include only shopping lists the owner marked public (or an empty list if none)
- **THEN** private shopping lists SHALL not appear

#### Scenario: Public profile filters private meal plans
- **WHEN** a viewer requests a user's public food profile
- **THEN** the response SHALL include only meal plans with a non-private visibility
- **THEN** private meal plans SHALL not appear
