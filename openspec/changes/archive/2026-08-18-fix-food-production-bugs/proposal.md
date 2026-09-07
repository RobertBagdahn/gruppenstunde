# Change: Fix Food Production Bugs

## Why

Auditing revealed several critical bugs, security gaps, and inconsistencies in the Food domain:
1. Exporting shopping lists from private recipes or meal plans lacked proper authorization checks.
2. Calculation discrepancies between meal-plan shopping calculations and direct recipe exports (e.g. exchange defaults, variants, unresolved portion weights).
3. Missing relations represented with sentinel `0` IDs rather than `NULL`.
4. Negative quantities and invalid related IDs were not strictly rejected.
5. Inconsistent section ordering and grouping by notes instead of sources.

## What Changes

- Enforce Food access policies across all recipe and meal-plan export endpoints.
- Ensure canonical active RecipeItem selection and calculation consistency across direct and meal-plan exports.
- Preserve unresolved units and quantities without zero-gram conversion.
- Use nullable foreign keys for provenance in `ShoppingListItemSource`.
- Enforce positive quantities and valid related foreign keys in shopping APIs.
- Group shopping-list items by persistent source records and use database retail-section ordering.
- Synchronize frontend Zod schemas and UI components.
