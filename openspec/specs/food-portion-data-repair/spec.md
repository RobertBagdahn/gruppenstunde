# food-portion-data-repair Specification

## Purpose
Defines deterministic detection, structured AI proposals, safe application, idempotent audit and staff review for repairing suspicious food portion data.

## Requirements

### Requirement: Deterministic portion repair scan
The system SHALL identify suspicious portions using deterministic rules before invoking AI.

#### Scenario: Piece named with one gram
- **WHEN** an active portion name indicates a piece and its weight is `1 g` or missing
- **THEN** the scanner SHALL create a repair finding candidate with the old values

#### Scenario: Normal valid gram portion
- **WHEN** a portion is a true Gramm portion with `weight_g=1`
- **THEN** the scanner SHALL not flag it solely because its weight is `1`

### Requirement: Structured AI repair proposals
The repair service SHALL ask Gemini for a structured proposed portion name, weight, confidence, rationale and classification.

#### Scenario: High-confidence correction
- **WHEN** Gemini returns a piece classification with confidence `0.95` and weight `80 g`
- **THEN** the finding SHALL become eligible for automatic application at the default threshold

#### Scenario: Low-confidence correction
- **WHEN** Gemini returns confidence `0.70`
- **THEN** the finding SHALL remain pending review and SHALL not be applied automatically

### Requirement: Safe application for referenced portions
The repair service SHALL never mutate the weight of a referenced portion in place when that would alter existing recipe semantics.

#### Scenario: Referenced portion repair
- **WHEN** a suspicious portion is referenced by three RecipeItems
- **THEN** the service SHALL create a corrected replacement portion
- **THEN** only the intended RecipeItems SHALL be moved to the replacement
- **THEN** the original portion SHALL remain unchanged

### Requirement: Idempotent repair audit
Repair application SHALL be idempotent and SHALL record before/after values, confidence, proposal version, actor and affected RecipeItems.

#### Scenario: Re-run applied finding
- **WHEN** an already applied finding is encountered again
- **THEN** the service SHALL not create another replacement or move items a second time

### Requirement: Staff review API
The system SHALL expose staff-only paginated findings with apply, reject and audit details.

#### Scenario: Non-staff access
- **WHEN** a non-staff user requests portion repair findings
- **THEN** the API SHALL return HTTP 403

#### Scenario: Staff list
- **WHEN** a staff user requests findings with `page` and `page_size`
- **THEN** the response SHALL use the standard paginated format
