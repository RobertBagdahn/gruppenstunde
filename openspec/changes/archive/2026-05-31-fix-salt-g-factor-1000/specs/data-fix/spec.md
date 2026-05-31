## Data Fix: salt_g Correction

### Requirements

- R1: All `Ingredient` records where `salt_g == sodium_mg * 2.5` (±0.01) must have their `salt_g` divided by 1000
- R2: The `nutrition_summary` API must scale recipe nutritional values by `norm_portions / recipe.servings` (matching the cost calculation logic)
- R3: MealItems without a recipe must be skipped in nutrition aggregation
- R4: Recipe caches (`cached_salt_g`) must be recalculated after the data fix
- R5: The fix must run on both local and production databases
