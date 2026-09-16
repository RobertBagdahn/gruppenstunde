## Purpose

Stückartige Angaben werden als benannte Portionen mit bestätigter technischer Gewichtsgrundlage behandelt.

## Requirements

### Requirement: MeasuringUnit type for countable units

The system SHALL keep `Stück` as a named portion concept backed by `Portion.weight_g`; it SHALL NOT require or create a dedicated `MeasuringUnit` record for `Stück` or `Packung`.

#### Scenario: Piece name without piece MeasuringUnit
- **WHEN** a portion is named `1 Zwiebel` and has `weight_g=80`
- **THEN** the portion SHALL remain valid with the canonical technical mass/volume unit model
- **THEN** the recipe UI SHALL display the portion name rather than forcing the label `Gramm`

### Requirement: No silent unit fallback

Unknown piece-like names SHALL be returned as unresolved input instead of falling back to `Gramm`.

#### Scenario: Unknown piece synonym
- **WHEN** unit resolution receives `Zehen` or `Stück` and no safe named portion can be selected
- **THEN** resolution SHALL return a clarification result
- **THEN** it SHALL NOT silently return the base Gramm unit
