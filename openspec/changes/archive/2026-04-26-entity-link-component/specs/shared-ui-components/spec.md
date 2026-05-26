## ADDED Requirements

### Requirement: EntityLink is the canonical cross-entity link mechanism
The `<EntityLink>` component (see `entity-link` capability) SHALL be the canonical way to render links to content entities across the frontend. Direct usage of `<Link>` or `<a>` to an entity detail route is discouraged outside of the component itself.

The NewTab policy (list context → new tab, detail context → same tab) SHALL be documented in `frontend/AGENTS.md` so contributors follow it when adding new pages.

#### Scenario: New page renders entity links correctly
- **WHEN** a contributor adds a new list-style page
- **THEN** the page SHALL wrap its content in `<EntityLinkContext value="list">`
- **AND** any entity name rendered in cards/rows SHALL use EntityLink

#### Scenario: AGENTS.md documents the policy
- **WHEN** a reviewer checks `frontend/AGENTS.md`
- **THEN** a section "Entity-Links & NewTab-Policy" SHALL describe: the component, the URL resolution table, the context wrapper, and the "list opens new tab / detail stays same tab" rule
