## Why

Aktuell können nur Staff-User Essenspläne und Einkaufslisten erstellen. Normale angemeldete User haben keinen Zugriff auf diese Features, obwohl sie gerade für die eigenständige Planung von Gruppenaktivitäten und Lagern wertvoll wären. Alle angemeldeten User sollen Essenspläne und Einkaufslisten erstellen und per Collaborator-System teilen können.

## What Changes

- **BREAKING**: `is_staff`-Prüfungen bei Erstellung von Meal Plans und Shopping Lists entfernen → `is_authenticated` reicht
- Meal Plan bekommt ein Collaborator-System (analog zu `ShoppingListCollaborator`) mit Rollen: viewer, editor, admin
- List-Endpunkte für Meal Plans filtern auf: eigene + wo User Collaborator ist (statt "alle für Staff")
- Shopping List List-Endpunkt: gleiches Filterverhalten (eigene + Collaborator)
- Frontend: Erstell-Buttons und Navigation für alle angemeldeten User sichtbar

## Capabilities

### New Capabilities
- `meal-plan-collaborator`: Rollenbasiertes Collaborator-System für Essenspläne (viewer/editor/admin), analog zum bestehenden Shopping-List-Collaborator-Pattern

### Modified Capabilities
- `meal-plan`: Erstellung nicht mehr auf Staff beschränkt, List-Endpunkt zeigt nur eigene + Collaborator-Pläne
- `shopping-list`: Erstellung nicht mehr auf Staff beschränkt, List-Endpunkt zeigt nur eigene + Collaborator-Listen

## Impact

- **Backend Apps**: `planner` (Meal Plan API + neues Model), `shopping` (API-Permissions)
- **Models**: Neues `MealPlanCollaborator`-Model in `planner` App → Migration erforderlich
- **Pydantic Schemas**: Neue Schemas für `MealPlanCollaborator` (Create/Response), Anpassung der MealPlan-List-Response
- **Zod Schemas**: Entsprechende Frontend-Schemas für Collaborator-Management
- **API-Endpunkte**: Neue CRUD-Endpunkte für Meal Plan Collaborators, Anpassung bestehender Permission-Checks
- **Frontend Pages**: Meal Plan Detail (Collaborator-UI), Shopping List (Permission-Gates entfernen), Navigation
