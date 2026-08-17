## Why

Essenspläne können bisher nicht geteilt werden — obwohl das Backend (MealPlanCollaborator-Modell mit VIEWER/EDITOR/ADMIN-Rollen volle CRUD-API und Permission-Checks) vollständig implementiert ist. Die User-invite-UI und der generische User-Search-Endpoint fehlen. Kollaboratoren werden nicht benachrichtigt. Zudem ist die Owner/Editor-Unterscheidung im Frontend inkonsistent (ShoppingList nutzt lokale Logik, Recipe hat is_owner per API, MealPlan hat gar keine Unterscheidung).

## What Changes

- **Generischer User-Search-Endpoint**: `GET /api/users/search/?q=` in `core` App, ablösend des Shopping-List-spezifischen Endpoints
- **is_owner-Vereinheitlichung**: `is_owner: bool` per API für MealPlanDetailOut und ShoppingListDetailOut — analog zum bestehenden Recipe-Pattern
- **MealPlan-Collaborator-Count**: `collaborators_count: int` im `MealPlanOut`-List-Schema
- **MealPlan-Collaborator-UI**: CollaboratorManager-Komponente analog zum ShoppingList-Pattern, mit Share-Button in der Action-Leiste von MealEventDetailPage
- **E-Mail-Benachrichtigung**: Synchroner `send_mail`-Call beim Hinzufügen eines Collaborators, unter Nutzung der bestehenden CI-gestylten Email-Templates
- **User-Suche Frontend**: Generischer `useUsers()`-Hook in `api/users.ts`, nutzbar von allen CollaboratorManagern (MealPlan + ShoppingList)

## Capabilities

### New Capabilities

- `user-search`: Generischer, paginierter User-Search-Endpoint unter `/api/users/search/`, auffindbar und nutzbar von allen Apps
- `meal-plan-collaborator-ui`: Frontend-UI zum Verwalten von Essensplan-Mitgliedern inkl. Rollenauswahl und Entfernen

### Modified Capabilities

- `meal-plan-collaborator`: Backend-Endpoints existieren bereits — Erweiterung um `is_owner`-Feld, `collaborators_count`-Annotation im Listen-Response und `collaborators`-Array im Detail-Response
- `shopping-list`: `ShoppingListDetailOut` erhält `is_owner`-Feld für Konsistenz

## Impact

- **Backend**: `backend/core/` (neuer Router + Schemas), `backend/planner/api/meal_plan.py` (is_owner + collaborators_count), `backend/planner/schemas/meal_plan.py` (neue Felder), `backend/planner/services/notification_service.py` (neu), `backend/planner/templates/planner/email/` (neu), `backend/shopping/schemas.py` (+is_owner), `backend/inspi/urls.py` (neue Route)
- **Frontend**: `frontend-food/src/api/users.ts` (neu), `frontend-food/src/api/mealPlans.ts` (neue Hooks), `frontend-food/src/schemas/mealPlan.ts` (neue Felder), `frontend-food/src/components/meal/MealPlanCollaboratorManager.tsx` (neu), `frontend-food/src/pages/planning/MealEventDetailPage.tsx` (Share-Button), `frontend-food/src/schemas/shoppingList.ts` (+is_owner)
- **Tests**: Backend-API-Tests für user-search + collaborator-flow, Frontend-Komponententests
- **Keine DB-Migrationen** erforderlich (alle Felder auf API-Ebene)
