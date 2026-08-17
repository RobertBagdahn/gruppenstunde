## MODIFIED Requirements

### Requirement: AI text improvement for all content types
The AI text improvement service SHALL work with all content types (GroupSession, Blog, Game, Recipe), not just Ideas. The service SHALL accept a content_type parameter to provide type-appropriate improvements.

#### Scenario: AI improves GroupSession description
- **WHEN** POST `/api/ai/improve-text/` with text and content_type='session'
- **THEN** the AI SHALL improve the text with scout-activity-appropriate language

#### Scenario: AI improves Blog description
- **WHEN** POST `/api/ai/improve-text/` with text and content_type='blog'
- **THEN** the AI SHALL improve the text with article-appropriate formatting and structure

### Requirement: AI tag suggestions for all content types
The AI tag suggestion service SHALL work with all content types.

#### Scenario: AI suggests tags for Game
- **WHEN** POST `/api/ai/suggest-tags/` with content text and content_type='game'
- **THEN** the AI SHALL suggest relevant tags for the game
- **THEN** new tag suggestions SHALL be created as unapproved TagSuggestions

### Requirement: AI refurbish for all content types
The AI refurbish service (unstructured text to structured content) SHALL work with all content types. The service SHALL detect or accept the target content_type and parse accordingly.

#### Scenario: AI refurbish to GroupSession
- **WHEN** POST `/api/ai/refurbish/` with raw text and content_type='session'
- **THEN** the AI SHALL parse the text into GroupSession fields (title, summary, description, materials, difficulty, etc.)

#### Scenario: AI refurbish to Recipe
- **WHEN** POST `/api/ai/refurbish/` with raw text and content_type='recipe'
- **THEN** the AI SHALL parse the text into Recipe fields including ingredients and quantities

#### Scenario: AI refurbish to Game
- **WHEN** POST `/api/ai/refurbish/` with raw text and content_type='game'
- **THEN** the AI SHALL parse the text into Game fields including rules, player count, play area

### Requirement: AI image generation for all content types
The AI image generation service SHALL work with all content types.

#### Scenario: Generating image for Game
- **WHEN** POST `/api/ai/generate-image/` with title, description, and content_type='game'
- **THEN** the AI SHALL generate a title image appropriate for the game type
- **THEN** the image SHALL be saved as WebP format

### Requirement: AI supply suggestions
The AI service SHALL suggest Materials and Ingredients based on content description.

#### Scenario: AI suggests materials for GroupSession
- **WHEN** POST `/api/ai/suggest-supplies/` with content text and content_type='session'
- **THEN** the AI SHALL return a list of suggested Materials with quantities per person
- **THEN** suggestions SHALL reference existing Supply entries where possible
- **THEN** new Supply entries SHALL be flagged for creation

#### Scenario: AI suggests ingredients for Recipe
- **WHEN** POST `/api/ai/suggest-supplies/` with content text and content_type='recipe'
- **THEN** the AI SHALL return a list of suggested Ingredients with quantities per NormPerson
- **THEN** the AI SHALL also suggest relevant kitchen Materials
