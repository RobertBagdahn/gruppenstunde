## Why

Currently, staff members cannot mark recipes and ingredients as "verified" directly within the edit UI — they must use separate endpoints or workflows. Additionally, recipe metadata like `source_url` and `authors` cannot be managed from the edit form. This creates friction and leaves important verification capabilities buried in the approval queue. A critical security issue also exists: non-staff users can bypass the approval workflow by directly setting `recipe.status="approved"` via the recipe update endpoint.

## What Changes

- **Security fix**: Protect `recipe.status` field from non-staff modification (currently unprotected; mirrors existing `ingredient.status` protection)
- **Recipe verification UI**: Staff can directly set recipe `status` (draft → approved) within the recipe editor, with clear visual indicator
- **Recipe metadata fields**: Expose `source_url` and `authors` (collaborators) in the recipe edit form for staff to manage
- **Ingredient inline verification**: Staff sees a "Verify" toggle button next to each ingredient in the recipe editor to mark ingredients as `status="verified"` without leaving the recipe view
- **UX improvement**: Hide "Verified" status option from non-staff in the Ingredient edit page (currently shows option, then 403 error on save)

## Capabilities

### New Capabilities

- `recipe-staff-verification`: Staff-only UI section in recipe editor to set status, manage source_url, and manage collaborators (authors)
- `ingredient-inline-verification`: Staff-only verification controls (toggle button) for each ingredient within the InlineIngredientEditor, allowing status="verified" without navigation

### Modified Capabilities

- `recipe-approval-workflow`: Security fix — `recipe.status` changes now staff-only (consistent with ingredients); non-staff users can no longer bypass approval by setting status directly

## Impact

**Backend (Django)**:
- `backend/recipe/api/recipes.py`: Update `update_recipe()` to protect `status` field (add staff-only check before setting)
- `backend/recipe/schemas/recipes.py`: Add `status`, `source_url`, `authors` to `RecipeUpdateIn` schema (staff-only fields via API documentation or separate response)
- `backend/supply/api/ingredients.py`: Reference existing staff-only check pattern for consistency

**Frontend (React/TypeScript)**:
- `frontend-food/src/pages/recipes/EditRecipePage.tsx`: Add staff-only section with status selector, source_url input, authors multi-select
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`: Add staff-only "Verify" toggle button per ingredient; trigger PATCH to update ingredient status
- `frontend-food/src/pages/ingredients/IngredientEditPage.tsx`: Conditionally render "Verified" option only for staff users

**Schemas & API**:
- `backend/content/schemas/base.py` or new staff-permissions schema: Document staff-only field restrictions
- Pydantic ↔ Zod schema sync: Align RecipeUpdateIn and Ingredient status handling

**Database**: No migrations needed (fields already exist)

**Breaking Changes**: None — fields are optional in update payloads, backward compatible
