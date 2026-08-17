## ADDED Requirements

### Requirement: Game Content Type
The system SHALL provide a `Game` model inheriting from `Content` for games and activities (Spiele). Additional fields: game_type (TextChoices), min_players (IntegerField, nullable), max_players (IntegerField, nullable), play_area (TextChoices: indoor/outdoor/both), game_duration_minutes (IntegerField, nullable), rules (TextField, Markdown).

#### Scenario: Creating a Game
- **WHEN** a user creates a new Game via the stepper
- **THEN** the Game SHALL be stored with all Content base fields plus game-specific fields

#### Scenario: Viewing Game detail
- **WHEN** a user navigates to `/games/:slug`
- **THEN** the page SHALL display: title, description, rules (Markdown), player range, play area, duration
- **THEN** a metadata bar SHALL show: player count icon + range, area icon, duration icon
- **THEN** related content sections SHALL show "Passende Ideen", "Passende Wissensbeiträge"

### Requirement: Game Subtypes
Game SHALL support the following subtypes as TextChoices: field_game (Geländespiel), group_game (Gruppenspiel), icebreaker (Kennenlernspiel), cooperation (Kooperationsspiel), night_game (Nachtspiel), board_game (Brettspiel/Kartenspiel), running_game (Laufspiel), skill_game (Geschicklichkeitsspiel).

#### Scenario: Filtering by game type
- **WHEN** a user filters search results by game_type='field_game'
- **THEN** only Games with that game type SHALL be returned

#### Scenario: Game type determines icon
- **WHEN** a Game is displayed
- **THEN** the game type SHALL be shown with a type-specific icon and color

### Requirement: Game Material Assignment
Games SHALL support optional Material assignment via ContentMaterialItem for games that need equipment (balls, ropes, blindfolds, etc.).

#### Scenario: Game with materials
- **WHEN** a Game has materials assigned
- **THEN** a "Material" section SHALL display the materials with quantities
- **THEN** quantities SHALL be per person or per group (configurable via quantity_per_person flag)

### Requirement: Game API
The system SHALL provide CRUD API endpoints for Game under `/api/games/`.

#### Scenario: List games
- **WHEN** GET `/api/games/?page=1&page_size=20`
- **THEN** the system SHALL return paginated, approved Games
- **THEN** results SHALL be filterable by game_type, play_area, min_players, max_players, difficulty, scout_level, tags

#### Scenario: Get game by slug
- **WHEN** GET `/api/games/by-slug/{slug}/`
- **THEN** the system SHALL return the full Game detail including rules, materials, comments, emotions, related content

#### Scenario: Create game
- **WHEN** POST `/api/games/` with at least a title
- **THEN** the system SHALL create a Game with status='draft'
