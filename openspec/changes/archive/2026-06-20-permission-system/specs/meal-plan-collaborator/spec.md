## REMOVED Requirements

### Requirement: MealPlanCollaborator Model
**Reason**: Replaced by the generic `ContentCollaborator` model. All collaborator functionality (viewer/editor/admin roles, CRUD, access control) is now handled through `ContentCollaborator` with `content_type` pointing to `planner.MealPlan`.
**Migration**: All existing `MealPlanCollaborator` rows SHALL be migrated to `ContentCollaborator` rows. The `MealPlanCollaborator` model and table SHALL be removed.

### Requirement: API endpoints for meal plan collaborators
**Reason**: Moved to `ContentCollaborator` endpoints at `/api/content-collaborators/`. The meal-plan-specific `/api/meal-plans/{id}/collaborators/` endpoint SHALL proxy to or be replaced by the generic endpoint.
**Migration**: Frontend SHALL use the new `ContentCollaborator` API endpoints.

### Requirement: Role-based access control for meal plans (via MealPlanCollaborator)
**Reason**: Replaced by `ContentCollaborator` role system. Same roles (viewer/editor/admin), same permissions, but implemented generically.
**Migration**: No behavior change — only the underlying model and API endpoint change.
