## Context

The breakfast wizard uses three `NutritionalTag` instances (`frühstücks-basis`, `frühstücks-belag`, `frühstücks-getränk`) to categorize ingredients and recipes into functional roles. This is a semantic misuse — `NutritionalTag` is designed for dietary classifications (vegan, gluten-free, etc.), not feature-specific roles.

The existing `content.Tag` system (hierarchical tags with parent/children, slug, icon, sort_order) is the correct mechanism. It's already used by all Content types (including Recipe) via `Content.tags`. Ingredient, as a standalone model, lacks this field.

All three seed commands and the breakfast catalog API currently reference `NutritionalTag` objects directly.

## Goals / Non-Goals

**Goals:**
- Replace `NutritionalTag`-based breakfast categorization with `content.Tag`
- Add `tags = ManyToManyField("content.Tag")` to Ingredient
- Create four English-named tags: `breakfast-base`, `breakfast-topping`, `breakfast-drink`, `breakfast-warm-meal`
- Migrate existing tag relationships to new system
- Remove old NutritionalTag instances
- Consolidate three seed commands into one

**Non-Goals:**
- No changes to the breakfast wizard UI behavior or calculation logic
- No changes to the `content.Tag` model itself
- No changes to `NutritionalTag` for non-breakfast dietary tags

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tag system** | `content.Tag` instead of `NutritionalTag` | Correct semantic model — tags are for categorization, not dietary properties |
| **Tag names** | English (breakfast-base, breakfast-topping, etc.) | Consistent with codebase language convention (English code, German UI) |
| **Tag structure** | Flat (no parent hierarchy) | Three tags are independent categories in the wizard; a parent "breakfast" hierarchy adds complexity without benefit |
| **Ingredient field name** | `tags` | Matches `Content.tags` naming; no confusion since Ingredient doesn't inherit from Content |
| **Recipe field** | Existing `Recipe.tags` (inherited from Content) | No new field needed; `breakfast-drink` and `breakfast-warm-meal` are just new Tag instances added to the existing M2M |
| **API filter** | Filter by content.Tag slug instead of NutritionalTag name | Single endpoint unchanged; filter target changes |
| **Response format** | Full Tag objects (slug, name, icon) in catalog response | Frontend needs slugs for category identification; full objects enable future flexibility |
| **API structure** | Single endpoint (as before), returning all four categories | No breaking change to frontend routing; just response content changes |
| **Seed consolidation** | Single `seed_breakfast_catalog.py` command | Simpler maintenance; all breakfast seed data in one place |
| **Cleanup** | Remove old NutritionalTag instances entirely | No dead data; clean break |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Data migration must preserve existing tag relationships** | Data migration: for each Ingredient with `nutritional_tags__name__in=['frühstücks-basis', 'frühstücks-belag']`, create corresponding `content.Tag` + M2M entry before removing NutritionalTag instances |
| **Frontend checks on `ingredient_tags` string array need updating** | The `ingredient_tags` field in MealItemOut returns tag identifiers; switch from NutritionalTag names to Tag slugs. Update all frontend string comparisons |
| **RefMeal items tagged with German tags become un-categorizable after migration** | Migration handles this — tag relationships transfer to new system, so persisted items reference the new tags via the MealItem serializer |
| **Catalog API response shape changes** | Breaking change is acceptable per project policy. Frontend schemas update in lockstep with backend |
