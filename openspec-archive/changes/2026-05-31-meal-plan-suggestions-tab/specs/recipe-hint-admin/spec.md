## REMOVED Requirements

### Requirement: Staff can list all RecipeHints
**Reason**: RecipeHint merged into unified Rule model. Admin UI consolidated into single "Regeln" tab.
**Migration**: RecipeHint data migrated to Rule with scope="recipe". Admin tab removed.

### Requirement: Staff can filter RecipeHints
**Reason**: Filtering available in unified "Regeln" admin tab.
**Migration**: Filter by scope="recipe" to see former RecipeHints.

### Requirement: Staff can create a RecipeHint
**Reason**: Staff creates Rules with scope="recipe" instead.
**Migration**: Use Rule creation form with scope="recipe".

### Requirement: Staff can edit a RecipeHint
**Reason**: Staff edits Rules instead.
**Migration**: Use Rule edit form.

### Requirement: Staff can delete a RecipeHint
**Reason**: Staff deletes Rules instead.
**Migration**: Use Rule delete action.

### Requirement: CRUD API for RecipeHints
**Reason**: Replaced by `/api/rules/admin/` CRUD endpoints.
**Migration**: Frontend switches from `/api/recipe-hints/` to `/api/rules/admin/`.
