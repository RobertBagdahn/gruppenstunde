## ADDED Requirements

### Requirement: GroupSession Content Type
The system SHALL provide a `GroupSession` model inheriting from `Content` for scout group meeting ideas (Gruppenstundenideen). Additional fields: session_type (TextChoices), min_participants (IntegerField, nullable), max_participants (IntegerField, nullable), location_type (TextChoices: indoor/outdoor/both).

#### Scenario: Creating a GroupSession
- **WHEN** a user creates a new GroupSession via the stepper
- **THEN** the GroupSession SHALL be stored with all Content base fields plus session-specific fields
- **THEN** the session_type SHALL be one of the defined subtypes

#### Scenario: Viewing GroupSession detail
- **WHEN** a user navigates to `/sessions/:slug`
- **THEN** the page SHALL display all content fields, material list, session type badge, participant range
- **THEN** related content sections SHALL show "Passende Spiele", "Passende Rezepte", "Passende Wissensbeiträge"

### Requirement: GroupSession Subtypes
GroupSession SHALL support the following subtypes as TextChoices: scout_skills (Pfadfindertechnik), navigation (Orientierung), nature_study (Naturkunde), crafts (Basteln), active_games (Geländespiele), outdoor_cooking (Lagerküche), first_aid (Erste Hilfe), community (Soziales), campfire_culture (Musisches), exploration (Forschung).

#### Scenario: Filtering by session type
- **WHEN** a user filters search results by session_type='scout_skills'
- **THEN** only GroupSessions with that session type SHALL be returned

#### Scenario: Session type badge on card
- **WHEN** a GroupSession card is displayed
- **THEN** the session type SHALL be shown as a colored badge

### Requirement: GroupSession Material Assignment
GroupSession SHALL support assigning Materials via ContentMaterialItem. Materials SHALL be displayed as "Material" section with quantities per person.

#### Scenario: Viewing materials on GroupSession
- **WHEN** a user views a GroupSession detail page with materials
- **THEN** a "Material" section SHALL list all assigned materials with quantity per person
- **THEN** each material name SHALL be a link to the Material detail page

#### Scenario: Adding materials via Supply search
- **WHEN** an author adds materials in the GroupSession stepper
- **THEN** the supply search SHALL filter for Materials only (not Ingredients)

### Requirement: GroupSession Ingredient Assignment
GroupSession SHALL also support assigning Ingredients via the same Supply search. This enables sessions that involve cooking or food preparation to list needed ingredients.

#### Scenario: Adding ingredients to a GroupSession
- **WHEN** an author adds an ingredient to a GroupSession
- **THEN** the ingredient SHALL appear in a separate "Zutaten" section
- **THEN** quantities SHALL be per NormPerson

### Requirement: GroupSession API
The system SHALL provide CRUD API endpoints for GroupSession under `/api/sessions/`.

#### Scenario: List sessions
- **WHEN** GET `/api/sessions/?page=1&page_size=20`
- **THEN** the system SHALL return paginated, approved GroupSessions
- **THEN** results SHALL be filterable by session_type, difficulty, scout_level, tags

#### Scenario: Get session by slug
- **WHEN** GET `/api/sessions/by-slug/{slug}/`
- **THEN** the system SHALL return the full GroupSession detail including materials, links, comments, emotions

#### Scenario: Create session
- **WHEN** POST `/api/sessions/` with at least a title
- **THEN** the system SHALL create a GroupSession with status='draft'
- **THEN** the authenticated user SHALL be set as author
