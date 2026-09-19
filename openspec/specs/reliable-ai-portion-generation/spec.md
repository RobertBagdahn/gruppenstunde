# reliable-ai-portion-generation Specification

## Purpose
Robuste, fachlich nachvollziehbare KI-Erzeugung und Bestätigung von Ingredient-Portionen.

## Requirements

### Requirement: AI portion suggestions are normalized before presentation
The portion preview service SHALL normalize known AI unit spellings and aliases to existing `MeasuringUnit` records before exposing an operation. It MUST reject unknown units explicitly instead of silently treating them as Gramm.

#### Scenario: AI uses a known abbreviation
- **WHEN** the AI returns `g`, `gramm`, or `Stk` for a unit that has a canonical database match
- **THEN** the preview SHALL expose the canonical existing unit name
- **THEN** the operation SHALL retain its proposed physical weight in grams

#### Scenario: AI uses an unknown unit
- **WHEN** the AI returns a unit that cannot be mapped to an existing `MeasuringUnit`
- **THEN** the operation SHALL not be applicable
- **THEN** the preview SHALL expose a user-visible reason or omit the invalid operation without creating data

### Requirement: Partial valid AI responses remain usable
The service SHALL retain every distinct valid suggestion with a positive quantity and positive proposed weight. It MUST NOT discard all valid suggestions solely because the response contains fewer than four suggestions.

#### Scenario: AI returns two valid typical portions
- **WHEN** Gemini returns two distinct complete suggestions and no applicable replacement is unsafe
- **THEN** the preview SHALL display both suggestions independently
- **THEN** the user SHALL be able to apply either or both suggestions

#### Scenario: AI returns no complete suggestion
- **WHEN** the initial response contains no applicable complete suggestion
- **THEN** the service MAY perform exactly one repair request
- **THEN** if repair also fails, the preview SHALL return a clear empty or manual-resolution state without mutating portions

### Requirement: Piece and package semantics remain physically calculable
The system SHALL represent a countable or package portion with a named portion, quantity, canonical unit semantics and a positive `weight_g` calculation basis. A generated operation MUST NOT silently assign an implicit one-gram weight to a piece-like name.

#### Scenario: AI proposes one apple
- **WHEN** the AI proposes `1 Stück` for an apple with `weight_g=150`
- **THEN** the preview SHALL show the piece suggestion with its physical weight
- **THEN** applying it SHALL preserve the named piece semantics and use 150 grams in calculations

#### Scenario: AI proposes a package
- **WHEN** the AI proposes one package with a positive package weight
- **THEN** the preview SHALL show the package as a separate selectable suggestion
- **THEN** applying it SHALL create a complete portion without changing existing weighted portions

### Requirement: Preview and apply contracts expose actionable validation state
The backend Pydantic schemas and Food frontend Zod schemas SHALL parse the same preview operations, including canonical unit data, selection state, missing-weight state and deletion/replacement state.

#### Scenario: Contract round trip
- **WHEN** the preview endpoint returns a complete suggestion, an unchanged weighted row and an incomplete manual-weight row
- **THEN** both backend response validation and frontend Zod parsing SHALL preserve all operation fields
- **THEN** the UI SHALL distinguish unchanged, applicable, and manual-resolution operations

### Requirement: Portion generation remains authorization- and transaction-safe
The preview endpoint SHALL require an authenticated editor and SHALL not mutate data. Apply SHALL revalidate authorization, preview freshness and weight safety in one transaction.

#### Scenario: Unauthenticated generation request
- **WHEN** an unauthenticated client calls the preview endpoint
- **THEN** the API SHALL return HTTP 403
- **THEN** Gemini SHALL not be called

#### Scenario: Stale preview after a source changes
- **WHEN** a portion changes between preview and apply
- **THEN** apply SHALL return a conflict/error response
- **THEN** no selected source SHALL be deleted and no new portion SHALL be created
