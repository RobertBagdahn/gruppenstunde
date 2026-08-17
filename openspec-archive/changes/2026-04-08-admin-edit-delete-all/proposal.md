## Why

Staff/Admin-Nutzer (`is_staff=True`) können aktuell im Backend bereits alle Inhalte bearbeiten und löschen, aber im Frontend fehlen die entsprechenden UI-Elemente. Auf Content-Detailseiten (Session, Blog, Game, Recipe) gibt es keinen Löschen-Button, und auf Content-Listenseiten (Cards) gibt es weder Edit- noch Delete-Icons. Admins sollen immer alle Aktionen sehen und ausführen können, ohne den Umweg über die Django-Admin-Oberfläche nehmen zu müssen.

## What Changes

- **Delete-Button auf Content-Detailseiten**: Session, Blog, Game und Recipe Detailseiten erhalten einen Delete-Button (mit Bestätigungsdialog), der für Admins und berechtigte Autoren sichtbar ist.
- **`can_delete`-Feld im Backend und Frontend**: Neues berechnetes Feld `can_delete` wird neben `can_edit` in der API-Response zurückgegeben. Für Content-Typen (Session, Blog, Game): nur `is_staff`. Für Recipe: `is_staff` oder Autor/Ersteller (bestehendes Verhalten).
- **Admin-Actions auf Content-Cards (Listenseiten)**: `ContentCard` und `RecipeCard` erhalten optionale Edit/Delete-Icons, die für Admins sichtbar sind. Dafür wird `can_edit`/`can_delete` pro Item in der List-API ergänzt.
- **Backend: `can_edit` und `can_delete` in paginierten Listen-Responses**: Die Content-Listen-Endpunkte werden erweitert, um pro Item `can_edit` und `can_delete` mitzuliefern, damit das Frontend die Icons korrekt ein-/ausblenden kann.
- **Konsistenz Recipe-Löschberechtigung**: Recipe-Delete wird analog zu den anderen Content-Typen auf `is_staff`-only eingeschränkt (aktuell können auch Autoren löschen). **BREAKING**

## Capabilities

### New Capabilities
- `content-permissions`: Einheitliches Berechtigungssystem für Edit/Delete auf allen Content-Typen mit `can_edit` und `can_delete` Feldern in API-Responses (Detail + Liste), Admin-Actions auf Cards und Delete-Button auf Detailseiten.

### Modified Capabilities
- `content-base`: `ContentBaseOut`/`ContentDetailOut` Schema wird um `can_delete` erweitert. Listen-Responses liefern `can_edit`/`can_delete` pro Item.
- `admin`: Admin-Nutzer erhalten im Frontend sichtbare Edit/Delete-Actions auf allen Content-Seiten (Liste + Detail).

## Impact

**Backend (Django Apps)**:
- `content` App: `enrich_content_with_interactions()` in `content/api/helpers.py` um `can_delete` erweitern. `ContentDetailOut` und `ContentListOut` Schemas um `can_delete` ergänzen.
- `session` App: `api.py` — List-Endpunkt liefert `can_edit`/`can_delete` pro Item.
- `blog` App: `api.py` — List-Endpunkt liefert `can_edit`/`can_delete` pro Item.
- `game` App: `api.py` — List-Endpunkt liefert `can_edit`/`can_delete` pro Item.
- `recipe` App: `api/recipes.py` — List-Endpunkt liefert `can_edit`/`can_delete` pro Item. Delete-Berechtigung auf `is_staff`-only ändern.

**Pydantic-Schemas (Backend)**:
- `content/schemas/base.py`: `ContentDetailOut` + neues `ContentListItemOut` mit `can_edit: bool` und `can_delete: bool`

**Zod-Schemas (Frontend)**:
- `schemas/content.ts`: `ContentDetailSchema` und `ContentListItemSchema` um `can_delete` erweitern

**Frontend (React Pages/Components)**:
- `components/content/ContentCard.tsx`: Edit/Delete-Icons als optionale Props
- `components/recipe/RecipeCard.tsx`: Edit/Delete-Icons als optionale Props
- `pages/sessions/SessionDetailPage.tsx`: Delete-Button mit ConfirmDialog
- `pages/blogs/BlogDetailPage.tsx`: Delete-Button mit ConfirmDialog
- `pages/games/GameDetailPage.tsx`: Delete-Button mit ConfirmDialog
- `pages/recipes/RecipeDetailPage.tsx`: Delete-Button mit ConfirmDialog

**Keine Migrationen nötig** — `can_edit` und `can_delete` sind berechnete Felder, keine DB-Felder.
