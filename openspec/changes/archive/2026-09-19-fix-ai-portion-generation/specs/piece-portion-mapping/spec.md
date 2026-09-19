## MODIFIED Requirements

### Requirement: Named piece portions use confirmed gram bases
The system SHALL represent a countable food portion as a named `Portion` with a physical `weight_g` used for calculations. The AI portion flow SHALL preserve the countable name and quantity while using the confirmed gram basis; it SHALL not require a new unit migration when the existing technical gram basis is the established representation.

#### Scenario: Confirmed piece portion
- **WHEN** a recipe item uses the portion `kleines Brötchen` with quantity `30` and confirmed `weight_g=45`
- **THEN** the recipe display SHALL show `30 kleine Brötchen`
- **THEN** nutrition, price and shopping calculations SHALL use `1350 g`

#### Scenario: AI creates a confirmed piece portion
- **WHEN** an editor confirms an AI proposal for `1 Stück` with `weight_g=150`
- **THEN** the created portion SHALL retain the piece-like name and quantity
- **THEN** calculations SHALL use `150 g` and SHALL not infer a different weight from a fallback unit

### Requirement: Unknown piece weight never falls back silently
The system MUST NOT convert an unresolved piece-like input to Gramm or assign an implicit `1 g` weight. The portions magic wand SHALL expose the unresolved operation for manual positive-weight entry or leave it unapplied.

#### Scenario: AI cannot determine a piece weight
- **WHEN** a piece-like suggestion has no positive proposed weight
- **THEN** the preview SHALL mark it as requiring manual weight
- **THEN** apply SHALL remain blocked for that selected operation until a positive weight is entered
