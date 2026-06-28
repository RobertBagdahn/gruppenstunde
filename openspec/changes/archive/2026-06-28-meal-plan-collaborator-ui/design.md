## Context

Essenspläne (MealPlan) können kollaborativ genutzt werden — das Backend hat seit `openspec/specs/meal-plan-collaborator/` ein vollständiges `MealPlanCollaborator`-Modell mit VIEWER/EDITOR/ADMIN-Rollen, CRUD-Endpoints und Permission-Checks (`_require_access`/`_require_edit`/`_require_admin`). Die Frontend-UI zum Verwalten von Mitgliedern fehlt jedoch. Parallel existiert ein identisches Pattern für Einkaufslisten (ShoppingList) mit einem fertigen `CollaboratorManager`-Component.

Drei Inkonsistenzen bestehen:
- **is_owner**: Recipe hat `is_owner: bool` per API, ShoppingList berechnet es lokal (`user.id === list.owner_id`), MealPlan hat gar keine Unterscheidung (nur `can_edit`)
- **User-Suche**: ShoppingList hat `GET /api/shopping-lists/users/`, aber keinen generischen Endpoint
- **Benachrichtigung**: Keine Benachrichtigung beim Hinzufügen eines Collaborators

## Goals / Non-Goals

**Goals:**
- Generischen User-Search-Endpoint in `core` bereitstellen
- `is_owner` per API für MealPlan und ShoppingList vereinheitlichen
- CollaboratorManager-UI für Essenspläne bauen (analog ShoppingList)
- E-Mail-Benachrichtigung beim Hinzufügen eines Collaborators
- Testabdeckung für alle neuen und geänderten Komponenten

**Non-Goals:**
- Kein Invite-Workflow mit Pending/Accepted-Status (sofortiger Zugriff)
- Kein generisches In-App-Notification-System (braucht eigenes Proposal)
- Kein WebSocket-Real-Time-Update für Collaborator-Änderungen
- Kein generelles Redesign der Permission-Helper

## Decisions

### 1. User-Search-Endpoint in `core` App
- **Entscheidung**: `GET /api/users/search/?q=<query>&page=1&page_size=20` in `backend/core/api.py`
- **Schema**: `UserSimpleOut` (`id`, `username`) + `PaginatedUserOut` ziehen aus `shopping/schemas.py` nach `core/schemas.py`
- **Alternativen**: In `profiles` (hat bereits User-Endpoints) — dagegen spricht, dass `profiles` profil-spezifisch ist, `core` aber app-übergreifende Infrastruktur beherbergt
- **Shopping-Migration**: Alter Endpoint bleibt als Redirect/kompatibler Wrapper, neue Nutzer nutzen `core`

### 2. `is_owner` als API-Feld
- **Entscheidung**: `is_owner: bool` wird im View gesetzt (wie `can_edit`), nicht via Pydantic-Resolver — dadurch kein Request-Kontext im Schema nötig
- **MealPlan**: `meal_plan.is_owner = (role == "owner")` in `get_meal_plan()` (bestehender role-Call)
- **ShoppingList**: `shopping_list.is_owner = (request.user.id == obj.owner_id)` im View
- **Frontend-Konsistenz**: Alle drei Entitäten (Recipe, MealPlan, ShoppingList) nutzen `entity.is_owner` aus der API

### 3. CollaboratorManager-Architektur
- **Pattern**: 1:1-Adaption von `shopping/CollaboratorManager.tsx`
- **Unterschiede**:
  - Nutzt generischen `useUsers()`-Hook statt ShoppingList-spezifischem
  - API-Hooks in `api/mealPlans.ts` (nicht eigener File)
  - `MealPlanCollaboratorSchema` in `schemas/mealPlan.ts`
- **Platzierung**: Als eigener Dialog/Sheet, geöffnet über [Teilen]-Button in der Action-Leiste von `MealEventDetailPage.tsx`
- **Sichtbarkeit**: Button nur für Owner (`plan.is_owner`)

### 4. E-Mail-Benachrichtigung
- **Entscheidung**: Synchroner `send_mail()`-Call im `add_collaborator`-Endpoint
- **Template**: Eigenes Template in `planner/templates/planner/email/`, erbt von `event/email/base.html`
- **Pattern**: Folgt `content/services/email_service.py` (gleicher `send_mail`-Aufruf, gleiche CI-Parameter)
- **Alternative async**: Nicht nötig — E-Mail-Versand dauert ~100ms, API-Call bleibt unter 200ms

### 5. `collaborators_count` im Listen-Response
- **Entscheidung**: Annotation via `Count("mealplancollaborator", distinct=True)` im `list_meal_plans`-Query
- **Alternative**: Subquery — unnötig komplex, da `Count`-Annotation bei der bestehenden Query-Struktur trivial ist

## Risks / Trade-offs

| Risiko | Mitigation |
|--------|------------|
| ShoppingList `is_owner`-Feld: Frontend muss von lokalem Vergleich auf API-Feld umstellen | Einmalige Migration in `ShoppingListDetailPage.tsx` — `list.is_owner` statt `user.id === list.owner_id` |
| User-Search-Endpoint migrated von Shopping → Core: Bestehende ShoppingList-API-Calls müssen umgestellt werden | Alter Endpoint bleibt als kompatibler Wrapper erhalten; neue `useUsers()`-Hooks nutzen `core` |
| E-Mail-Versand schlägt fehl (SMTP nicht konfiguriert?) | `fail_silently=True` wie bestehende Email-Services; Logging für Debugging |
| Kein Rollback bei fehlgeschlagener E-Mail nach erfolgreichem DB-Insert | Akzeptiert — der Collaborator ist angelegt, die Benachrichtigung ist ein Optimierungsversuch |
