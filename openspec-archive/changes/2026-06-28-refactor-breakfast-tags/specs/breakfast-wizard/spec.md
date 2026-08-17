## Capability: breakfast-wizard — Tagging Mechanism Change

This delta spec documents changes to the breakfast-wizard capability requirements.

### Changed Requirements

#### Requirement: Breakfast ingredient categorization

**OLD:** Base ingredients are tagged with `NutritionalTag` named `frühstücks-basis`. Topping ingredients tagged with `frühstücks-belag`. Drink recipes tagged with `frühstücks-getränk`.

**NEW:** Base ingredients are tagged with `content.Tag` slug `breakfast-base`. Topping ingredients tagged with `breakfast-topping`. Drink recipes tagged with `breakfast-drink`. Warm-meal recipes tagged with `breakfast-warm-meal`.

#### Requirement: Breakfast catalog API response

**OLD:** The catalog response includes NutritionalTag-derived data.

**NEW:** The catalog response includes `content.Tag` objects (slug, name, icon). The endpoint filters ingredients/recipes by `content.Tag` slug instead of `NutritionalTag` name.

#### Requirement: MealItem `ingredient_tags` field

**OLD:** `ingredient_tags` returns NutritionalTag names (e.g. `"frühstücks-basis"`).

**NEW:** `ingredient_tags` returns `content.Tag` slugs (e.g. `"breakfast-base"`).

#### Requirement: Seed commands

**OLD:** Three separate commands: `seed_breakfast_base_ingredients`, `seed_breakfast_topping_ingredients`, `seed_breakfast_drink_recipes`.

**NEW:** Single consolidated command `seed_breakfast_catalog` that creates all four content.Tag instances and tags all ingredients/recipes.

### Removed Requirements

- NutritionalTag instances `frühstücks-basis`, `frühstücks-belag`, `frühstücks-getränk` no longer exist
- `Recipe.nutritional_tags` is no longer used for breakfast categorization (drink and warm-meal recipes use `Recipe.tags` with content.Tags instead)

### Unchanged Requirements

All other breakfast-wizard requirements (wizard routing, BE calculation, slider rebalance, intensity, leftovers, cockpit, save logic) remain unchanged.
