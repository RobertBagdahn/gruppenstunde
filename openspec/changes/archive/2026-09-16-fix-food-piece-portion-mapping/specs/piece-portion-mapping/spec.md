## ADDED Requirements

### Requirement: Named piece portions use confirmed gram bases
The system SHALL represent a countable food portion as a named `Portion` with a physical `weight_g` used for calculations, without requiring a `Stück` MeasuringUnit.

#### Scenario: Confirmed piece portion
- **WHEN** a recipe item uses the portion `kleines Brötchen` with quantity `30` and confirmed `weight_g=45`
- **THEN** the recipe display SHALL show `30 kleine Brötchen`
- **THEN** nutrition, price and shopping calculations SHALL use `1350 g`

### Requirement: Unknown piece weight never falls back silently
The system MUST NOT convert an unresolved piece-like input to Gramm or assign an implicit `1 g` weight.

#### Scenario: Unknown piece during import
- **WHEN** an import extracts `1 Wassermelone` and no trusted matching portion exists
- **THEN** the import response SHALL mark the item as requiring portion clarification
- **THEN** the response SHALL include no fabricated `1 g` weight

### Requirement: AI proposes missing piece weights
The system SHALL request an ingredient-specific weight proposal from AI for unresolved piece-like inputs and SHALL return the proposal with source and confidence metadata.

#### Scenario: AI proposal for a new piece size
- **WHEN** the AI processes `2 kleine Brötchen` and no matching confirmed portion exists
- **THEN** the response SHALL include `weight_proposal_g`, the suggested portion name and a confirmation-required status

### Requirement: User confirmation creates or selects a portion
The system SHALL require explicit user confirmation before a new AI piece-weight proposal is used to create a RecipeItem.

#### Scenario: User confirms a new size
- **WHEN** an authenticated recipe editor confirms `kleines Brötchen` with `weight_g=45`
- **THEN** the system SHALL create or reuse a uniquely named portion with that weight
- **THEN** the recipe item SHALL reference the confirmed portion

#### Scenario: User rejects a proposal
- **WHEN** the user rejects the AI proposal
- **THEN** the system SHALL not create the proposed portion
- **THEN** the recipe SHALL remain unsaved or require another valid portion choice

### Requirement: Existing portions are preferred
The system SHALL reuse an existing active portion when its normalized name and trusted weight match the requested piece semantics.

#### Scenario: Existing portion matches
- **WHEN** an ingredient already has a confirmed portion `mittleres Brötchen` with `weight_g=62.5`
- **THEN** importing `1 mittleres Brötchen` SHALL select that portion without a new confirmation dialog

### Requirement: Conflicting AI estimates require a choice
The system SHALL present an existing portion and an AI proposal as separate choices when their weights differ materially.

#### Scenario: Existing portion differs from AI
- **WHEN** the ingredient has `Brötchen=62.5 g` and AI proposes `45 g`
- **THEN** the user SHALL be able to keep the existing portion or confirm a new portion
- **THEN** the existing portion SHALL not be overwritten automatically

### Requirement: Piece status is exposed consistently
The backend Pydantic and frontend Zod schemas SHALL expose portion weight status, source and proposal fields consistently.

#### Scenario: Schema round trip
- **WHEN** an API response contains `weight_status="ai_proposed"` and `weight_proposal_g=45`
- **THEN** the Food frontend SHALL parse and render those values without dropping them
