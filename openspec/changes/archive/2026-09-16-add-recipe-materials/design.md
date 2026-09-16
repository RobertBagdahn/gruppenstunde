## Context

`ContentMaterialItem` already provides a GenericForeignKey from content to `Material`, and recipes have an admin inline. The current recipe API and Food frontend do not expose a complete material workflow. AI supply suggestions also mix Material and Equipment concepts.

## Goals / Non-Goals

**Goals:**

- Reuse `ContentMaterialItem` for recipe materials instead of introducing a duplicate recipe-only table.
- Add typed recipe material list/create/update/delete endpoints with ownership checks.
- Add a separate Food frontend section for ingredients, materials and equipment.
- Support AI suggestions with an explicit review/apply step.
- Preserve free-form quantities such as `30 Stück`, `1 Rolle` and `nach Bedarf`.

**Non-Goals:**

- Do not turn materials into ingredients or calculate nutrition for them.
- Do not merge the Material and Equipment database models.
- Do not add materials to ordinary recipe ingredient quantities.

## Decisions

### Reuse GenericFK with recipe-specific router

Implement recipe material endpoints at `/api/recipes/{recipe_id}/materials/` using `ContentMaterialItem` and the Recipe ContentType. This avoids a migration for a parallel table and keeps existing admin-created entries visible.

### Add update and ordering support

The recipe material API returns `id`, `material_id`, `material_name`, `quantity` and `sort_order`. Create, PATCH, DELETE and reorder endpoints are scoped to the recipe. Material existence and recipe edit permission are checked server-side.

### Separate AI suggestion output

Introduce a recipe-specific suggestion schema with `material_id`, `suggested_name`, `quantity`, `matched_name` and `is_new`. The AI service may match existing Material records but never persists on suggestion. A separate apply endpoint performs selected creates/links atomically.

### Frontend architecture

Use TanStack Query hooks and a reusable `RecipeMaterialsEditor` in the recipe edit page and wizard. Recipe detail renders a read-only material list. Equipment remains managed through the existing Equipment relation.

## Risks / Trade-offs

- [GenericFK has no database-level recipe uniqueness] -> Add application-level duplicate checks and a composite index if needed.
- [Material suggestions may be ambiguous] -> Show matched name and require confirmation; unresolved names are not silently created.
- [Existing admin entries may have incomplete quantities] -> Display the original string and allow correction.

## Migration Plan

1. Add recipe material API and schemas using existing rows.
2. Add frontend read-only and edit flows.
3. Add AI suggestion/apply endpoints and tests.
4. Add an index or metadata only if query profiling requires it; no destructive data migration.
