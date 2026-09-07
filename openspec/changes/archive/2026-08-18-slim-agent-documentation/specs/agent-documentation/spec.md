## ADDED Requirements

### Requirement: Agent rules contain implementation guidance only

The project SHALL use `AGENTS.md` files for durable implementation rules, architecture constraints, tooling commands, language conventions, validation rules, and area-specific coding patterns. Product behavior and feature requirements MUST NOT be maintained only in `AGENTS.md`.

#### Scenario: Agent starts work in the repository

- **WHEN** an agent reads the root `AGENTS.md`
- **THEN** it receives project-wide implementation constraints without a complete feature inventory

#### Scenario: Agent starts work in a specialized area

- **WHEN** an agent works under `backend/`, `frontend/`, or `frontend-food/`
- **THEN** it receives only the implementation rules applicable to that area in addition to the root rules

### Requirement: Current feature requirements are available in OpenSpec

Current product requirements previously documented in `AGENTS.md` SHALL be represented by a corresponding OpenSpec specification or an explicit reference to an existing specification before those details are removed.

#### Scenario: Feature detail is removed from an agent file

- **WHEN** a still-valid feature requirement is deleted from an `AGENTS.md`
- **THEN** the requirement exists in `openspec/specs/` with at least one testable scenario

#### Scenario: Historical or obsolete detail is removed

- **WHEN** an agent file contains a requirement that is disproven by the current code or superseded by a newer specification
- **THEN** the detail is removed without creating a new product requirement

### Requirement: Agent documentation has one clear source per scope

The project SHALL keep project-wide rules in root `AGENTS.md`, backend implementation rules in `backend/AGENTS.md`, main frontend rules in `frontend/AGENTS.md`, and food frontend rules in `frontend-food/AGENTS.md`.

#### Scenario: Rule belongs to one area

- **WHEN** a new durable implementation rule is introduced
- **THEN** it is documented in the narrowest applicable `AGENTS.md` scope and not duplicated in unrelated scopes

#### Scenario: Documentation is validated

- **WHEN** the documentation cleanup is completed
- **THEN** OpenSpec validation succeeds and no removed root instruction file remains referenced as authoritative project guidance
