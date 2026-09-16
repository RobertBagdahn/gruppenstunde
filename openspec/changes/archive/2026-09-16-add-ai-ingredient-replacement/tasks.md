## 1. Replacement Domain And Mapping

- [x] 1.1 Add the generic-to-concrete replacement mapping model, indexes, active flag, provenance fields and migration.
- [x] 1.2 Seed reviewed mappings such as `Salz -> Jodsalz`, `Milch -> Kuhmilch 3,5 %` and `Nudeln -> Fusilli trocken`.
- [x] 1.3 Extend the ingredient matcher with mapping-aware results and replacement confidence metadata.
- [x] 1.4 Add tests for mapping direction, inactive mappings, ambiguous aliases and generic/concrete filtering.

## 2. Recipe API

- [x] 2.1 Extend AI suggestion Pydantic schemas with replacement item ID, reason and confidence fields.
- [x] 2.2 Add an atomic `POST /api/recipes/{recipe_id}/items/{item_id}/replace/` endpoint with ownership, portion and idempotency validation.
- [x] 2.3 Preserve RecipeItem IDs, notes, order, optional flags and step assignments while recalculating caches.
- [x] 2.4 Prevent preview-only matching from creating draft Ingredient rows and retain apply-time creation behavior for confirmed candidates.
- [x] 2.5 Add backend tests for `Salz -> Jodsalz`, invalid target portions, permission errors, concurrent requests and cache updates.

## 3. Food Frontend

- [x] 3.1 Synchronize Pydantic and Zod suggestion/replacement schemas.
- [x] 3.2 Add a distinct `Ersetzen` action to the inline ingredient editor without changing `Alternative hinzufügen` behavior.
- [x] 3.3 Render replacement reason, source ingredient and target portion in the confirmation dialog.
- [x] 3.4 Add TanStack Query mutation/invalidation and German success/error feedback.
- [x] 3.5 Add component and workflow tests proving replacement does not create a duplicate or exchange group.

## 4. Verification

- [x] 4.1 Run targeted recipe matcher, AI suggestion, RecipeItem and variant tests.
- [x] 4.2 Run frontend typecheck, lint and replacement UI tests.
- [x] 4.3 Verify existing exchange-group and meal-plan variant behavior remains unchanged.
