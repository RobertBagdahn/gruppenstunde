## ADDED Requirements

### Requirement: AI SHALL provide weighted practical portion suggestions
The portions magic-wand preview SHALL request and return at least one practical new portion with a positive `proposed_weight_g` for an ordinary ingredient when the current data does not already provide that portion. Piece-based ingredients SHALL receive a piece-oriented suggestion such as `Stück` whenever the ingredient context supports it.

#### Scenario: Hotdog bun receives a piece estimate
- **WHEN** an authenticated editor requests a fresh preview for an ingredient named `Hotdog-Brötchen` without a weighted Stück portion
- **THEN** the preview SHALL include a new Stück-oriented operation with `proposed_weight_g > 0`
- **THEN** the estimate SHALL be plausible for a normal hotdog bun, with the acceptance fixture allowing approximately 55 g
- **THEN** the operation SHALL remain unpersisted until explicit apply confirmation

#### Scenario: Ordinary ingredient receives a useful suggestion
- **WHEN** an authenticated editor requests a fresh preview for an ordinary ingredient with incomplete portion data
- **THEN** the AI response or bounded repair response SHALL include at least one selected-or-selectable practical portion with a positive total weight
- **THEN** the operation SHALL include quantity, measuring-unit name, confidence when available and a rationale

### Requirement: New package suggestions SHALL be internally consistent
When package context or product semantics make a package useful, the preview MAY include a package operation. Its `proposed_weight_g` SHALL represent the total package weight and SHALL be consistent with the suggested quantity and piece estimate within the documented tolerance.

#### Scenario: Bun package is suggested
- **WHEN** the AI identifies a typical six-bun package for an ingredient whose Stück estimate is 55 g
- **THEN** the package operation SHALL describe six units and a total weight near 330 g
- **THEN** the package operation SHALL be independently selectable from the Stück operation

### Requirement: Incomplete AI output SHALL receive one bounded repair attempt
The backend SHALL detect a structurally valid AI response that has no positive weighted practical suggestion for an ordinary ingredient and SHALL issue at most one structured repair request. If the repaired response remains incomplete, the preview SHALL expose a manual-input state and SHALL block apply for affected operations.

#### Scenario: First response omits all usable weights
- **WHEN** the first AI response contains only new ordinary suggestions with null or non-positive weights
- **THEN** the backend SHALL issue one repair request with the missing weight requirements
- **THEN** the backend SHALL use the repaired positive suggestion when available

#### Scenario: Repair response remains unresolved
- **WHEN** both the initial and one repair AI response contain no positive weight for an affected operation
- **THEN** the preview SHALL mark the operation as requiring manual weight input
- **THEN** the apply action SHALL remain blocked until a positive weight is entered

### Requirement: AI estimates SHALL be reviewable and provenance-safe
The preview SHALL display the estimated weight, confidence and rationale where available. Applying an AI estimate SHALL require explicit user confirmation and SHALL preserve the existing server-side weight validation and AI provenance behavior.

#### Scenario: User reviews an estimate before apply
- **WHEN** the preview contains a positive AI estimate
- **THEN** the Food dialog SHALL show the estimate in grams and its rationale or confidence when provided
- **THEN** no create, replacement or delete request SHALL be sent before the user activates the apply action

### Requirement: Preview operations SHALL be reorderable before apply
The Food confirmation dialog SHALL allow the user to reorder selectable new and replacement operations with drag and drop. The first active operation in the confirmed order SHALL receive rank 1 and become the standard portion; later active operations SHALL receive increasing ranks. Reordering SHALL remain local until apply confirmation.

#### Scenario: User reorders suggested portions
- **WHEN** the user drags a selectable package or piece suggestion to a different position
- **THEN** the dialog SHALL update the visible order without mutating the ingredient
- **THEN** the apply request SHALL send ranks matching the confirmed order

#### Scenario: Weighted existing portion is protected during reorder
- **WHEN** the preview contains an existing weighted portion
- **THEN** that operation SHALL remain read-only and SHALL not be moved or assigned a new rank by the dialog

### Requirement: User can request more AI portion suggestions
The dialog SHALL provide an explicit action to request additional fresh AI portion suggestions after the initial preview. The action SHALL merge only non-duplicate suggestions into the local preview and SHALL never persist them before apply.

#### Scenario: More suggestions are requested
- **WHEN** the user activates "Weitere Portionen mit KI erzeugen"
- **THEN** the frontend SHALL request a fresh preview from the backend
- **THEN** newly returned non-duplicate operations SHALL appear as independently selectable suggestions
- **THEN** no apply or mutation request SHALL be sent by the additional-suggestions action

#### Scenario: Unauthenticated preview is requested
- **WHEN** an unauthenticated client requests the magic-wand preview endpoint
- **THEN** the backend SHALL return HTTP 403
- **THEN** no AI request SHALL be made
