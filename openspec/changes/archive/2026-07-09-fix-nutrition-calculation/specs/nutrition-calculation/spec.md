## ADDED Requirements

### Requirement: Density-adjusted weight for volumetric ingredients

Recipe weight calculations SHALL account for `ingredient.physical_density` when the assigned measuring unit is a VOLUME type (ml, l, EL, Tasse, etc.). This ensures correct gram weights for non-water-density ingredients like oil, honey, or syrup.

#### Scenario: Oil measured in ml uses density correction

- **GIVEN** an ingredient `Olivenöl` with `energy_kcal=900`, `physical_density=0.92`, `physical_viscosity="liquid"`
- **AND** a Portion `"100ml"` with `measuring_unit="ml"` (unit.quantity=1), `weight_g=NULL`
- **WHEN** a RecipeItem links this portion with `quantity=1`
- **THEN** the weight SHALL be `100 × 1 × 1 × 0.92 = 92g`
- **AND** the energy contribution SHALL be `900 × 92/100 = 828 kcal`

#### Scenario: Gram-based measuring unit skips density

- **GIVEN** an ingredient with `physical_density=0.92`
- **AND** a Portion `"200g"` with `measuring_unit="g"` (unit.quantity=1, type=MASS), `weight_g=NULL`
- **WHEN** a RecipeItem links this portion with `quantity=1`
- **THEN** the weight SHALL be `200g` (measuring_unit.quantity only, density NOT applied)

#### Scenario: Portion with explicit weight_g ignores density

- **GIVEN** an ingredient with `physical_density=0.92`
- **AND** a Portion `"1 Tasse"` with `weight_g=240`, `measuring_unit="Tasse"`, `quantity=1`
- **WHEN** a RecipeItem links this portion with `quantity=1`
- **THEN** the weight SHALL be `240g` (weight_g used directly, density NOT applied)

### Requirement: Consistent per-serving values in nutrition breakdown

The `/nutrition-breakdown/` endpoint SHALL return per-item values divided by `recipe.portions` so that the sum of per-item `energy_kcal` equals `per_serving_energy_kcal`.

#### Scenario: Per-item values match per-serving total

- **GIVEN** a recipe with `portions=4` and items contributing `{energy: [200, 300, 100], total=600}`
- **WHEN** fetching `/api/recipes/{id}/nutrition-breakdown/`
- **THEN** each item's `energy_kcal` SHALL be `[50, 75, 25]` (total/portions)
- **AND** `per_serving_energy_kcal` SHALL be `150`
- **AND** `total_energy_kcal` SHALL be `600`

### Requirement: Preview dialogs show per-serving kcal

Recipe preview dialogs and print view SHALL display calories per serving using `cached_energy_total_kcal / portions`, NOT the per-100g `cached_energy_kcal`.

#### Scenario: Preview dialog shows per-serving kcal

- **GIVEN** a recipe with `cached_energy_kcal=60`, `cached_energy_total_kcal=300`, `cached_weight_g=500`, `portions=1`
- **WHEN** the preview dialog opens
- **THEN** the displayed kcal SHALL be `300` (cached_energy_total_kcal / portions) not `60`

#### Scenario: Preview falls back to null without cache

- **GIVEN** a recipe with `cached_energy_total_kcal=NULL`
- **WHEN** the preview dialog opens
- **THEN** displayed kcal SHALL be `null` (no misleading value shown)
