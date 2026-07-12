## MODIFIED Requirements

### Requirement: Single Source of Truth
The list of generic terms SHALL be derived from all `IngredientAlias` rows with `is_generic = true` (distinct, case-insensitive). This list serves as the single source of truth for generic term classification, name validation, and import concretization.

The seed data SHALL contain ~70-90 generic terms (all single-word food names without qualifiers), distributed 1:N across all matching concrete ingredients. This replaces the previous minimum of 6 terms.

#### Scenario: Generic terms populated from seed data
- **WHEN** `import_prod_data --only food` is executed
- **THEN** `IngredientAlias.objects.filter(is_generic=True)` returns ~70-90 distinct names
- **AND** each generic term exists on ALL matching concrete ingredients (e.g., "Salz" on Jodsalz, Meersalz, Steinsalz)

#### Scenario: Generic term spans multiple ingredients
- **WHEN** the generic term "Nudeln" exists as a generic alias
- **THEN** it is attached to Fusilli trocken, Spaghetti, Penne, Farfalle, and other pasta variants
- **AND** all carry `is_generic=True`
- **AND** searching "Nudeln" returns all of them

### Requirement: Generic Aliases in Fixtures
Generic aliases SHALL be stored directly in the `supply_ingredientalias.json` fixture file, not created at runtime by a separate seed command.

#### Scenario: Aliases loaded from fixture
- **WHEN** `import_prod_data` imports food data
- **THEN** all generic and non-generic aliases are loaded from supply_ingredientalias.json
- **AND** no additional seed command is needed

### Requirement: Non-Generic Alias Completeness
Every ingredient SHALL have comprehensive non-generic aliases including synonyms, plural forms, regional variants, and REWE product names where applicable.

#### Scenario: Ingredient has synonym aliases
- **WHEN** viewing aliases for "gemahlener schwarzer Pfeffer"
- **THEN** non-generic aliases include "schwarzer Pfeffer", "Pfeffer gemahlen"
- **AND** if REWE products match, their names are added as aliases
