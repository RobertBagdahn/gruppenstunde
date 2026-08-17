## Context

The food frontend has three inconsistent patterns for determining edit permissions:

1. **Server-provided `can_edit`/`can_delete`** — Recipes, Sessions, Blogs, Games, ShoppingList (detail), MealPlan (detail). All use `can_edit`/`can_delete` fields resolved server-side and exposed in API responses.
2. **Client-side computation** — Ingredients compare `user.id === created_by_id || user.is_staff`. No `can_edit` in the API response.
3. **Missing entirely** — IngredientCard (list), PortionCard (detail), SortablePortionItem (drag handles), MealPlanListPage dropdown, RefMealEditorPage — show edit controls to all users regardless of permissions.

The underlying cause: no shared convention forces schemas to expose permission fields. Each resource solves this differently, some not at all.

## Goals / Non-Goals

**Goals:**
- Establish a shared Pydantic mixin and Zod base for `can_edit`/`can_delete` fields
- Add `can_edit`/`can_delete` to all food resource schemas (detail + list) that currently lack them
- Guard all edit controls (buttons, drag handles, inline editors) in the food frontend with permission checks
- Switch ingredient permission checks from client-side computation to server-provided fields
- Document the convention in `backend/AGENTS.md` and `frontend-food/AGENTS.md`

**Non-Goals:**
- Changing the backend permission *logic* (e.g., `_can_edit_ingredient`) — only exposing its result
- Adding `is_owner` to the base schema — that remains resource-specific
- Fixing permission issues in the main `frontend/` app — this change is food-frontend only
- Adding new permission checks to pages that don't have edit controls (read-only pages)
- Refactoring the `content/schemas/base.py` ContentListOut/ContentDetailOut schemas — they already work correctly

## Decisions

### Decision 1: Shared mixin in `core/schemas.py`

A new `HasPermissions(BaseModel)` mixin with `can_edit: bool` and `can_delete: bool` lives in `backend/core/schemas.py`. This is separate from `content/schemas/base.py` because non-Content resources (Ingredient, Material, ShoppingList, MealPlan, RefMeal) cannot use Content's base schemas.

**Alternatives considered:**
- Putting it in `content/schemas/base.py` — semantically wrong for non-Content resources
- No shared base, duplicate in every schema — violates DRY, makes the convention harder to enforce

### Decision 2: `can_edit` + `can_delete` only (no `is_owner`)

`is_owner` is resource-specific and not every resource has a clear owner concept (e.g., Materials have no owner). Adding it to the base would force some resources to return `is_owner: false` always, which is misleading. Resources that need `is_owner` (Recipes, MealPlans, ShoppingLists) keep it as an *additional* field on their schema.

### Decision 3: Both detail and list schemas get permission fields

List schemas need `can_edit`/`can_delete` to guard card-level actions (delete buttons, edit links, dropdown menus). The audit found IngredientCard showing a delete button on every list item — without list-level permission fields, this cannot be fixed.

**Performance note:** Computing `can_edit`/`can_delete` for list items requires a permission check per item. This is acceptable for the current scale and can be optimized later with bulk queries if needed.

### Decision 4: Each API endpoint resolves permissions using its own logic

The `HasPermissions` mixin only defines the *fields*. Each endpoint uses its existing permission function (e.g., `_can_edit_ingredient`, `_can_edit_recipe`, `_can_edit_meal_plan`) and annotates the object:

```python
# Pattern for detail endpoints
ingredient.can_edit = _can_edit_ingredient(ingredient, request.user)
ingredient.can_delete = (request.user.is_authenticated
    and (request.user.is_staff or ingredient.created_by_id == request.user.id))

# Pattern for list endpoints (annotated in the response loop)
for item in items:
    item.can_edit = ...
    item.can_delete = ...
```

This avoids coupling the permission *logic* to the schema — the schema only declares what fields exist.

### Decision 5: Frontend Zod base mirrors backend

`frontend-food/src/schemas/base.ts` gets a `permissionBaseSchema`:

```typescript
export const permissionBaseSchema = z.object({
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
```

Resource schemas use `.merge(permissionBaseSchema)` or `.extend({ can_edit: ..., can_delete: ... })`.

This maintains the 1:1 Pydantic↔Zod sync convention.

### Decision 6: Ingredient switches to server-provided permissions

Before:
```typescript
const canEdit = !!user && (user.is_staff || user.id === ingredient?.created_by_id);
```

After:
```typescript
const canEdit = ingredient?.can_edit ?? false;
const canDelete = ingredient?.can_delete ?? false;
```

The `created_by_id` field remains in the schema for display purposes (showing who created the ingredient), but permission decisions use `can_edit`/`can_delete`.

## Risks / Trade-offs

- **[Risk] List endpoint performance** → Computing `can_edit` per item adds N permission checks. Mitigation: Current list sizes are manageable. Can add bulk permission queries later if needed.
- **[Risk] Schema change is breaking** → All API consumers get new fields. Mitigation: No backward compatibility needed per project conventions. Frontend and backend deploy together.
- **[Risk] Material permissions are unclear** → Materials currently have no owner, only `created_by`/`updated_by`. Decision: `can_edit = request.user.is_staff`, `can_delete = request.user.is_staff`. Materials are globally shared resources.
- **[Risk] RefMeal permissions depend on parent MealPlan** → RefMeals belong to MealPlans. The permission check should use the parent MealPlan's `_can_edit_meal_plan()`. The RefMeal itself has no independent permission model.
