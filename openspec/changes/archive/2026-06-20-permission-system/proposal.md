## Why

Das Projekt hat kein einheitliches Rechte-System. Jede App implementiert eigene, inkonsistente Auth-Checks — manche Endpunkte haben gar keine. `is_staff` ist das einzige Rollen-Flag, es gibt kein Sharing zwischen Nutzern, und Sichtbarkeitsregeln sind je nach Content-Typ unterschiedlich. Das blockiert den produktiven Einsatz in echten Pfadfinder-Gruppen, wo mehrere Leiter gemeinsam Inhalte verwalten müssen.

## What Changes

- **BREAKING** UserProfile bekommt `role`-Feld (user/staff/admin). `is_staff=True` wird zu `role=admin` migriert.
- **BREAKING** Alle Content-Typen (Recipe, Ingredient, MealPlan, Session, Blog, Game) verwenden einheitlich `status` mit zwei Werten: `draft` und `verified`.
- **BREAKING** `visibility`-Feld auf Recipe und MealPlan entfällt. `owner`-Feld auf Recipe entfällt. `user_content`-Status auf Ingredient entfällt.
- ContentCollaborator: Generisches Sharing-Modell (viewer/editor/admin) für alle Content-Typen — ersetzt MealPlanCollaborator, ShoppingList-Collabs und PlannerCollaborator.
- Einheitliche Sichtbarkeitsregeln: Anonym sieht nur verified; Auth-User sieht verified + eigene Drafts; Staff/Admin sieht alles.
- Einheitliche Edit-Regeln: Drafts editierbar durch Creator, Co-Autoren, Shared-Editoren, Staff/Admin. Verified nur durch Staff/Admin.
- Draft-Löschung: Creator kann eigene Drafts soft-deleten. Staff/Admin kann alles hard-deleten. Kein Undo für Creator.
- Stammdaten (Materials, Units, Tags, DGE): Lesen für alle öffentlich, Schreiben nur Staff/Admin.
- Portion/Alias-Erstellung nur durch Ingredient-Creator (+Staff/Admin). Portionen erben Lock bei Ingredient-Verified.
- Sharing mit Usern und ganzen UserGroups, mit beliebigen sichtbaren Gruppen.

## Capabilities

### New Capabilities

- `permission-system`: Rollen-System (UserProfile.role), einheitliche can_edit/can_delete API-Flags, Status-basierte Sichtbarkeits- und Edit-Regeln für alle Content-Typen
- `content-collaborator`: Generisches Sharing-Modell mit GenericForeignKey, viewer/editor/admin-Rollen, User- und Group-Shares, ersetzt alle bestehenden Collab-Modelle

### Modified Capabilities

- `content-base`: Status-Feld vereinheitlicht auf `draft`/`verified`. Sichtbarkeitslogik zentralisiert. Soft-Delete für alle Content-Typen.
- `recipe`: `owner`- und `visibility`-Felder entfernt. Herkunft über `created_by`. Status statt visibility+approved.
- `ingredient-database`: `user_content`-Status entfernt. Status `draft`/`verified`. `created_by` als Herkunfts-Marker (null=Inspi).
- `meal-plan`: `visibility` entfernt, `status` (draft/verified) hinzugefügt. MealPlanCollaborator zu ContentCollaborator migriert.
- `meal-plan-collaborator`: Durch ContentCollaborator ersetzt.
- `shopping-list`: Collaborator-Modell zu ContentCollaborator migriert.
- `planner`: Collaborator-Modell zu ContentCollaborator migriert.
- `user-profiles`: `role`-Feld (CharField, choices user/staff/admin) auf UserProfile.
- `supply-base`: Material/Supply CRUD auf Staff/Admin beschränkt (Lesen bleibt öffentlich).

## Impact

- **Backend**: ~25 API-Endpunkte (Permissions, List-Filter, Create/Update/Delete-Checks), ~10 Model-Änderungen, 4 Migrationen
- **Frontend**: Alle List/Detail/Edit-Views müssen can_edit/can_delete auswerten. Neue Sharing-UI (Dialog, User/Group-Picker, Rollen-Select). Verified-Badge. Admin-Stammdaten-Verwaltung.
- **Daten-Migration**: is_staff→role=admin; approved/published→verified; user_content→draft; MealPlan/ShoppingList/Planner-Collabs→ContentCollaborator
- **API-Schemas**: Pydantic-Schemas (Backend) und Zod-Schemas (Frontend) synchron anpassen
