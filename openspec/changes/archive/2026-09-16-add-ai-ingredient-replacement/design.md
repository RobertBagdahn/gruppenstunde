## Context

The ingredient suggestion flow currently filters by IDs, aliases and basic term normalization. It does not model the relationship between a generic ingredient and its concrete canonical replacement, so prompts that normalize `Salz` to `Jodsalz` can create a second RecipeItem. The editor's current exchange action creates a variant group, which is not the desired behavior for a direct replacement.

## Goals / Non-Goals

**Goals:**

- Persist explicit generic-to-concrete replacement mappings.
- Use mappings in AI suggestion filtering and import/create flows.
- Provide a permission-checked atomic RecipeItem replacement action.
- Preserve the RecipeItem identity so step assignments and ordering survive.
- Keep direct replacement distinct from exchange groups.

**Non-Goals:**

- Do not automatically replace existing recipe ingredients without a user action.
- Do not merge or delete Ingredient master records.
- Do not redesign meal-plan variant selection.

## Decisions

### Dedicated replacement mapping

Add an `IngredientReplacementMapping` model with source ingredient, replacement ingredient, active flag, relation kind and optional provenance. Seed known mappings from existing generic-term data such as `Salz -> Jodsalz`. A dedicated relation is preferred over the currently unused `ingredient_ref` because direction and replacement semantics are explicit.

### Suggestion filtering returns replacement candidates

The AI suggestion service resolves candidate relationships before filtering. If a suggested ingredient is a configured replacement for an ingredient already in the recipe, the API returns a replacement candidate tied to the existing RecipeItem instead of an add candidate. The existing confirmation dialog can render a distinct action.

### Replace by changing the existing RecipeItem portion

The replacement endpoint accepts the target active portion rather than an ingredient ID. It validates that the portion belongs to the requested replacement ingredient, calculates a compatible quantity from the existing technical gram amount where possible, and updates the existing RecipeItem in one transaction. Keeping the RecipeItem ID preserves RecipeStepIngredient links.

### Do not create drafts during preview

Unknown ingredient records are created only when the user confirms an add or replacement. Preview calls return unresolved candidates without leaving discarded Ingredient rows.

### API and frontend contracts

- `POST /api/recipes/{recipe_id}/items/{item_id}/replace/` accepts target `portion_id`, optional quantity override and client request ID.
- Suggestion responses expose `replacement_for_item_id`, `replacement_reason` and confidence.
- Pydantic schemas and Food Zod schemas are updated together.
- The inline editor gets a direct `Ersetzen` action; the existing `Alternative hinzufügen` path remains unchanged.

## Risks / Trade-offs

- [Mappings can be wrong] -> Seed only reviewed mappings and expose the reason before confirmation.
- [Target portion has a different physical basis] -> Preserve grams where possible and require an explicit target portion/quantity when conversion is unsafe.
- [Concurrent replacement requests] -> Lock the RecipeItem and use idempotency/client request IDs.
- [Step references can become semantically stale] -> Preserve RecipeItem ID and show the replacement name in step displays.

## Migration Plan

1. Add the mapping model and seed reviewed generic-to-concrete relationships.
2. Add read-only replacement metadata to suggestion responses.
3. Deploy the atomic replacement endpoint and frontend action.
4. Enable preview-time filtering after the endpoint is available.
5. Existing recipes are not changed automatically; users can apply replacements explicitly.
