## ADDED Requirements

### Requirement: Primary navigation single-location policy for tool entries

The primary navigation (Desktop header, Mobile bottom-nav, Mobile more-menu) SHALL contain each tool entry at most once per user-facing surface. A tool MUST NOT appear both as a top-level link and inside the Tools dropdown / Tools section at the same time.

The Footer MAY reference any tool additionally, since it serves as a site-wide index and is not part of the primary interactive navigation.

This policy SHALL be documented in `frontend/AGENTS.md` so future tool additions follow it.

#### Scenario: Events is not duplicated in desktop navigation
- **WHEN** an authenticated user views the desktop header navigation
- **THEN** "Aktionen" (Events) SHALL appear exactly once as a top-level link
- **AND** "Aktionen" SHALL NOT appear inside the Tools dropdown

#### Scenario: Events is not duplicated in mobile more-menu
- **WHEN** an authenticated user opens the mobile more-menu
- **THEN** "Aktionen" (Events) SHALL NOT appear inside the Tools section of that menu
- **AND** the Mobile bottom-nav SHALL continue to show the "Aktionen" tab

#### Scenario: Footer can still link to Events
- **WHEN** a user scrolls to the footer
- **THEN** "Aktionen" MAY appear as a footer link regardless of its placement in primary navigation

#### Scenario: Policy applies to all tools, not only Events
- **WHEN** a new tool entry is added to the frontend navigation
- **THEN** the contributor MUST place it either as a top-level primary-nav entry OR inside the Tools dropdown/section, never both
