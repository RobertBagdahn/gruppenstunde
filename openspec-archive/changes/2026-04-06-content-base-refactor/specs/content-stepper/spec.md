## ADDED Requirements

### Requirement: Multi-Step Content Creation Stepper
The system SHALL provide a multi-step stepper component for creating all content types. The stepper SHALL guide users through content creation step by step with a progress indicator. Only the title field SHALL be required at creation time.

#### Scenario: Starting content creation
- **WHEN** a user navigates to `/create`
- **THEN** the system SHALL show a Create Hub with content type selection (GroupSession, Recipe, Game, Blog)
- **THEN** each type SHALL be displayed as a card with icon, name, and description

#### Scenario: Step 1 — Basic info and mode selection
- **WHEN** a user selects a content type and begins creation
- **THEN** Step 1 SHALL show: title input (required), subtype selection (type-specific), and mode toggle (KI-Erstellung / Manuell)

#### Scenario: KI-Erstellung mode
- **WHEN** a user selects "KI-Erstellung" mode
- **THEN** Step 2 SHALL show a large textarea for unstructured text input
- **THEN** a "Analysieren" button SHALL send the text to the AI service
- **THEN** the AI SHALL parse the text into structured fields and pre-fill subsequent steps
- **THEN** the user SHALL be able to review and edit each pre-filled field

#### Scenario: Manual creation mode
- **WHEN** a user selects "Manuell" mode
- **THEN** the stepper SHALL proceed directly to the description step
- **THEN** all fields SHALL be empty (except title)

#### Scenario: Step — Description and metadata
- **WHEN** the user is on the description step
- **THEN** the step SHALL show: summary (textarea), description (MarkdownEditor), difficulty, costs_rating, execution_time, preparation_time
- **THEN** each field SHALL have an optional "KI-Vorschlag" button that generates content based on the title and existing fields

#### Scenario: Step — Tags and scout levels
- **WHEN** the user is on the tags step
- **THEN** the step SHALL show: tag selection from existing tags (hierarchical tree), scout level checkboxes
- **THEN** a "Tags vorschlagen" button SHALL use AI to suggest relevant tags
- **THEN** the AI MAY suggest new tags that don't exist yet; these SHALL be created as unapproved TagSuggestions

### Requirement: Content-Type-Specific Stepper Steps
Each content type SHALL have additional type-specific steps in the creation stepper.

#### Scenario: GroupSession — Material step
- **WHEN** creating a GroupSession
- **THEN** there SHALL be a "Material" step after description
- **THEN** the step SHALL show a Supply search field (searching Materials)
- **THEN** if no matching Material is found, the user SHALL be prompted to create a new Material entry
- **THEN** quantities SHALL be per person (pro Person)

#### Scenario: Recipe — Ingredients step
- **WHEN** creating a Recipe
- **THEN** there SHALL be a "Zutaten" step after description
- **THEN** the step SHALL show a Supply search field (searching Ingredients)
- **THEN** quantities SHALL be per NormPerson
- **THEN** there SHALL be a separate "Küchengeräte" step for Material (knife, cutting board, oven, etc.)

#### Scenario: Game — Game-specific step
- **WHEN** creating a Game
- **THEN** there SHALL be a "Spieldetails" step with: min/max player count, play area (indoor/outdoor/both), estimated duration, game rules (Markdown)

#### Scenario: Blog — Blog-specific step
- **WHEN** creating a Blog
- **THEN** there SHALL be a reading time auto-calculation based on word count
- **THEN** there SHALL be a toggle for auto-generated table of contents

### Requirement: AI-Assisted Field Completion
The system SHALL provide AI-assisted completion for individual fields during content creation. Each field in the stepper SHALL have an optional "KI-Vorschlag" button.

#### Scenario: AI suggests description
- **WHEN** a user clicks "KI-Vorschlag" on the description field
- **THEN** the system SHALL send the title and existing fields to the AI service
- **THEN** the AI SHALL return a suggested description in Markdown format
- **THEN** the user SHALL be able to accept, edit, or reject the suggestion

#### Scenario: AI suggests materials/ingredients
- **WHEN** a user clicks "KI-Vorschlag" on the material/ingredients step
- **THEN** the AI SHALL suggest relevant materials or ingredients with quantities
- **THEN** suggestions SHALL reference existing Supply entries where possible
- **THEN** new Supply entries SHALL be suggested for items not in the database

### Requirement: AI Image Generation
The system SHALL provide AI-generated title images for all content types. Image generation SHALL use Gemini's image generation capability. Generated images SHALL be saved as WebP format.

#### Scenario: Generating a title image
- **WHEN** a user clicks "Bild generieren" on the image step
- **THEN** the system SHALL generate a title image based on the title and description
- **THEN** the generated image SHALL be previewed before saving
- **THEN** the user SHALL be able to regenerate or upload a custom image instead

### Requirement: Inline Editing in Detail View
Content editing SHALL NOT use the stepper. Instead, each section in the detail view SHALL have an edit button (pencil icon) visible to authors and admins. Clicking the edit button SHALL open a dialog or inline editor for that section.

#### Scenario: Editing a section inline
- **WHEN** an author clicks the pencil icon on a section
- **THEN** a dialog SHALL open with the editable fields for that section
- **THEN** the dialog SHALL include a "KI-Vorschlag" button
- **THEN** saving SHALL PATCH the content via API and invalidate the TanStack Query cache

#### Scenario: Edit visibility
- **WHEN** a user who is not the author or an admin views a content detail page
- **THEN** no edit pencil icons SHALL be visible

#### Scenario: KI suggestion in inline editor
- **WHEN** an author clicks "KI-Vorschlag" in an inline editor dialog
- **THEN** the AI SHALL generate an improved version of the current field value
- **THEN** the user SHALL see a diff or side-by-side comparison before applying
