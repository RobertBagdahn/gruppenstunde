## ADDED Requirements

### Requirement: Explicit generic-to-concrete replacement mappings
The system SHALL store directional mappings from a generic ingredient to a concrete replacement ingredient.

#### Scenario: Seeded salt mapping
- **WHEN** `Salz` is mapped to `Jodsalz`
- **THEN** the mapping SHALL identify `Jodsalz` as a replacement candidate, not an independent duplicate

### Requirement: Mapping-aware AI filtering
AI recipe ingredient suggestions SHALL consult active replacement mappings before returning add candidates.

#### Scenario: Existing generic ingredient
- **WHEN** a recipe already contains `Salz` and AI suggests `Jodsalz`
- **THEN** the API SHALL return a replacement candidate tied to the existing salt RecipeItem
- **THEN** it SHALL NOT return `Jodsalz` as an additional ingredient

#### Scenario: No existing related ingredient
- **WHEN** a recipe contains no ingredient in the mapping family
- **THEN** a matched concrete ingredient MAY be returned as a normal add candidate

### Requirement: Mapping provenance
Replacement mappings SHALL expose their active state and provenance to staff-facing management APIs.

#### Scenario: Inactive mapping
- **WHEN** a mapping is inactive
- **THEN** AI filtering SHALL ignore it
- **THEN** staff APIs SHALL still expose it for audit
