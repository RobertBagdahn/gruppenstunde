## ADDED Requirements

### Requirement: Omnibar ingredient search returns eligible ingredients
The Omnibar SHALL search all ingredients eligible for meal-plan use, not only ingredients marked standalone. Search results MUST exclude deleted and draft ingredients. The result order MUST preserve backend relevance and use a deterministic tie-breaker; client-side combination MUST NOT replace this order with an unrelated ordering. Any pagination parameters MUST be applied consistently across the complete result set.

#### Scenario: Search finds catalog ingredients beyond standalone entries
- **GIVEN** an authenticated editor searches the meal-plan Omnibar for „Zimt“
- **WHEN** matching active ingredients exist in the catalog, including ingredients not marked standalone
- **THEN** eligible matching ingredients SHALL be returned, not only standalone ingredients

#### Scenario: Draft and deleted ingredients are excluded
- **GIVEN** an authenticated editor searches for a name matching active, draft, and deleted ingredient records
- **WHEN** the ingredient search is performed
- **THEN** only active, non-deleted, meal-plan-eligible ingredients SHALL appear

#### Scenario: Relevance ordering remains stable
- **GIVEN** multiple eligible ingredients match a search query
- **WHEN** the API and Omnibar combine recipe and ingredient results
- **THEN** ingredient relevance order SHALL be preserved and ties SHALL use a stable deterministic key

#### Scenario: Anonymous access
- **GIVEN** a non-authenticated user
- **WHEN** the user attempts to use meal-plan ingredient search
- **THEN** no private meal-plan results SHALL be disclosed and the API SHALL enforce its documented authentication response

### Requirement: Touch-accessible search preview
The Omnibar preview and its primary add action MUST be usable without hover. At viewport widths from 320 px, the dialog SHALL keep the search result, preview controls, and primary action reachable without horizontal page overflow.

#### Scenario: Preview on touch device
- **GIVEN** an editor uses a touch device without a hover-capable pointer
- **WHEN** the editor selects an ingredient or recipe result
- **THEN** its preview and primary add action SHALL be available by touch

#### Scenario: Small viewport
- **GIVEN** the viewport width is 320 px
- **WHEN** the Omnibar is open and a result is selected
- **THEN** the primary add action SHALL remain visible or reachable by scrolling within the dialog
