## Why

Breakfast categorization (base, topping, drink) currently misuses `NutritionalTag` — a system designed for dietary classifications like "vegan", "gluten-free", "laktosefrei". Tags like `frühstücks-basis` are feature-specific functional roles, not nutritional properties. This semantic mismatch creates confusion and prevents proper use of the existing hierarchical `content.Tag` system.

## What Changes

- **Ingredient gets `tags` M2M** — New `ManyToManyField("content.Tag")` on `Ingredient`, parallel to `Content.tags`
- **Four English-named content.Tags** replacing German NutritionalTag breakfast tags:
  - `breakfast-base` → Ingredient (replaces `frühstücks-basis`)
  - `breakfast-topping` → Ingredient (replaces `frühstücks-belag`)
  - `breakfast-drink` → Recipe (replaces `frühstücks-getränk`)
  - `breakfast-warm-meal` → Recipe (new)
- **Breakfast catalog API** filters by `content.Tag` instead of `NutritionalTag`
- **BREAKING**: `NutritionalTag` instances `frühstücks-basis`, `frühstücks-belag`, `frühstücks-getränk` are removed
- **BREAKING**: Seed commands consolidated — three old commands replaced by single `seed_breakfast_catalog.py`
- **BREAKING**: Breakfast catalog API response returns `content.Tag` objects instead of `NutritionalTag` data

## Capabilities

### New Capabilities

_(None — this is a refactor of existing infrastructure, no new user-facing capability)_

### Modified Capabilities

- `breakfast-wizard`: Tagging mechanism for breakfast ingredients and recipes changes from `NutritionalTag` to `content.Tag`. Tag slugs change from German to English. Warm-meal recipes join the breakfast catalog as a new category.

## Impact

- **Backend**: `supply.models.Ingredient` — new `tags` field; `supply.api.breakfast_catalog` — filter target changes; seed commands consolidated
- **Schemas** (Pydantic + Zod): Breakfast catalog schemas reference `content.Tag` instead of `NutritionalTag`
- **Frontend**: `refMealToWizardState.ts`, `RefMealEditorPage.tsx` — tag checks update to new field/slugs
- **Data**: Zero data loss — migration copies tag relationships from NutritionalTag M2M to content.Tag M2M before removing NutritionalTag instances
- **Seed data**: All existing ingredients/recipes retain their breakfast categorization through the migration
