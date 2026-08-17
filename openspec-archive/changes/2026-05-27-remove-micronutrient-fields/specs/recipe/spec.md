## MODIFIED Requirements

### Requirement: Cached nutrition fields on Recipe
The Recipe model SHALL cache only `cached_vitamin_c_mg` as micronutrient cache field. The fields `cached_vitamin_a_mg`, `cached_vitamin_d_ug`, `cached_vitamin_b12_ug`, `cached_calcium_mg`, `cached_iron_mg` SHALL be removed.

#### Scenario: Recipe cache recalculation
- **WHEN** `recalculate_recipe_cache` runs
- **THEN** only `cached_vitamin_c_mg` is calculated and stored as micronutrient cache (macros unaffected)

#### Scenario: Nutrition breakdown API response
- **WHEN** the nutrition breakdown endpoint is called
- **THEN** micronutrient totals include only `vitamin_c_mg`
