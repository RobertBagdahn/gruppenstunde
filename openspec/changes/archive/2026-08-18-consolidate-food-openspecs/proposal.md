## Why

The Food OpenSpecs have accumulated overlapping and obsolete requirements from several archived changes. This makes the source of truth unclear, especially for recipe portions, ingredient inheritance, effective meal-plan portions, and nutritional-tag filtering. The contracts should be consolidated before further Food implementation work continues.

## What Changes

- **BREAKING** Define `Ingredient` as a standalone model; only `Material` inherits from `Supply`.
- **BREAKING** Make recipe quantities implicitly per portion with `portions=1`; remove `quantity_type` and duplicate serving rules.
- Make all meal-plan calculations use the shared `effective_portions` definition.
- Standardize recipe-search preview fields on `portions` and align price-per-serving calculations.
- Standardize Meal-Plan nutritional tags as exclusion filters in search and contextual suggestions.
- Remove duplicated or superseded requirements from the canonical Food specs and link detailed behavior to the owning capability.
- Add an audit rule so future Food specs do not reintroduce conflicting terminology or duplicate contracts.

## Capabilities

### New Capabilities

- `food-spec-governance`: Rules for canonical Food terminology, ownership of requirements, and duplicate/conflict prevention.

### Modified Capabilities

- `supply-base`: Clarify the inheritance boundary between `Material` and standalone `Ingredient`.
- `recipe-portion-normalization`: Make this the single owner of `portions=1` normalization.
- `meal-plan-effective-portions`: Make effective portions authoritative for every meal-plan output.
- `meal-planner-recipe-search`: Align preview fields and exclusion-tag semantics.

## Impact

- OpenSpec files under `openspec/specs/` and the new governance spec.
- Backend models, serializers, calculation services, recipe importers, and planner endpoints that still use legacy terminology.
- Frontend Food schemas and recipe/meal-plan search components.
- Potential data migration for recipes whose stored portions are not normalized and cleanup of obsolete fields.
- No compatibility layer is required because the project is in active development.
