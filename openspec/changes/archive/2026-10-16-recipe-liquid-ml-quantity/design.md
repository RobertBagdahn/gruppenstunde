## Context

`IngredientQuantityDialog` receives `ingredient: { id, name, slug, portions }`. Density and viscosity exist on the ingredient (`physical_density`, `physical_viscosity`) but are not passed in. `PortionPicker` already has sections for ingredient portions, standard measures (EL, TL, Tasse; these use `volume_ml`) and grams. `LIQUID_VISCOSITIES` (`beverage`, `liquid`) is defined in `frontend-food/src/schemas/supply.ts`.

## Goals / Non-Goals

**Goals**
- Enter ml for liquid ingredients with a known density.
- Store the result as grams, using the existing gram-based recipe item model.

**Non-Goals**
- No backend or schema change.
- No new unit storage (no "ml" portion saved to the database).
- No ml entry for solids or for ingredients without density.

## Decisions

- **Convert to grams on confirm.** ml is converted with `density` into the gram portion (same path as the existing standard measures). Alternative: store ml as a new unit. Rejected: it would need a backend change and a new unit type.
- **Pass `physical_density` and `physical_viscosity` as optional props.** The ingredient prop type is extended with optional fields so callers that lack them keep working. The callers load them via `useIngredient(slug)`, because the ingredient list items (search results) do not contain density.
- **Show "Milliliter" only when viscosity is liquid or beverage and density > 0.** Uses `LIQUID_VISCOSITIES`.

## Risks / Trade-offs

- [Density missing or wrong] → Section stays hidden without density; the conversion line makes the used density visible.
- [Callers not passing density] → Optional props; missing values hide the section, nothing breaks.

## Migration Plan

Frontend-only; deploy with the next frontend release. Rollback = revert the commit.

## Open Questions

- Should "l" be offered in addition to "ml" for large amounts? (Default: ml only.)
