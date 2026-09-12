# content-link-permissions Specification

## Requirements

### Requirement: Content link creation requires read access to both ends
The system SHALL only allow creating a content link if the requesting user can read both the source and the target content objects. Content links SHALL NOT expose private-content titles or IDs.

#### Scenario: User links two readable contents
- **WHEN** an authenticated user creates a link between two content objects they can read
- **THEN** the link SHALL be created

#### Scenario: User links a private target they cannot read
- **WHEN** an authenticated user attempts to link to a private content object they cannot read
- **THEN** the system SHALL return HTTP 404 and SHALL not create the link

#### Scenario: Anonymous user cannot create links
- **WHEN** an unauthenticated user attempts to create a content link
- **THEN** the system SHALL return HTTP 403
