## ADDED Requirements

### Requirement: Central prompt context builder
The system SHALL provide a central helper that builds a structured prompt-context block from available user, group, and environmental data. The block SHALL include, where available: the user's or group's nutritional/dietary tags, group or household size (number of persons / portions), the current season or month, and a summary of existing pantry/supply.

#### Scenario: Context includes dietary tags and group size
- **WHEN** a prompt is built for a user with nutritional tags and a known group size
- **THEN** the context block SHALL include those dietary tags and the number of persons

#### Scenario: Context is empty when no data available
- **WHEN** no dietary tags, group size, season, or pantry data is available
- **THEN** the context block SHALL be empty or omitted without breaking the prompt

#### Scenario: Context is appended to existing prompts
- **WHEN** an AI service builds a prompt
- **THEN** it SHALL include the central context block in addition to its feature-specific instructions

### Requirement: Prompt context does not leak private data
The context builder SHALL only include data the requesting user is authorized to see, and SHALL NOT include private data of other users.

#### Scenario: Own group size only
- **WHEN** building context for a user
- **THEN** the builder SHALL use the user's own group/household size, not unrelated users' data
