## 1. Backend: Admin-API Schema-Rename

- [x] 1.1 Rename `TopIdeaOut` -> `TopContentOut` in `backend/content/admin_api.py`
- [x] 1.2 Rename `AdminUserIdeaOut` -> `AdminUserContentOut` in `backend/content/admin_api.py`
- [x] 1.3 Rename `RecentIdeaOut` -> `RecentContentOut` in `backend/content/admin_api.py`
- [x] 1.4 Rename Felder: `idea_type` -> `content_type`, `idea_title` -> `content_title`, `idea_slug` -> `content_slug` in Admin-Schemas
- [x] 1.5 Rename Response-Felder: `total_ideas` -> `total_content`, `published_ideas` -> `published_content`, `top_ideas` -> `top_content`, `recent_ideas` -> `recent_content` in `AdminStatsOut`
- [x] 1.6 Update API-Funktionen die diese Schemas befüllen

## 2. Backend: Profil-API Cleanup

- [x] 2.1 Entferne `MyIdeaOut` und `PublicIdeaOut` Aliases aus `backend/profiles/schemas/profile.py`
- [x] 2.2 Update Re-Exports in `backend/profiles/schemas/__init__.py`
- [x] 2.3 Rename Endpoint `get_my_ideas` -> `get_my_content`, Pfad `/me/ideas/` -> `/me/content/` in `backend/profiles/api/profile.py`
- [x] 2.4 Behalte `/me/ideas/` als zusätzlichen Endpoint (Alias) für Übergangszeit

## 3. Frontend: Zod-Schema Cleanup

- [x] 3.1 Entferne `idea_type` Feld aus Content-Schema in `frontend/src/schemas/content.ts`, ersetze durch `content_type`
- [x] 3.2 Rename `ideas` -> `contents` in Supply-Schema in `frontend/src/schemas/supply.ts`
- [x] 3.3 Entferne `MyIdeaSchema`/`MyIdea` Aliases aus `frontend/src/schemas/profile.ts`, verwende `MyContentSchema`/`MyContent` direkt
- [x] 3.4 Update `result_type` Enum in `frontend/src/api/search.ts`: `'idea'` -> `'session'`

## 4. Frontend: API-Hooks Cleanup

- [x] 4.1 Rename `useMyIdeas` -> `useMyContent` in `frontend/src/api/profile.ts`
- [x] 4.2 Update Query-Key von `['profile', 'my-ideas']` -> `['profile', 'my-content']`
- [x] 4.3 Update fetch URL von `/api/profile/me/ideas/` -> `/api/profile/me/content/`
- [x] 4.4 Update Admin-Hooks in `frontend/src/api/admin.ts`: Schema-Referenzen auf neue Namen

## 5. Frontend: Page-Komponenten Cleanup

- [x] 5.1 Update `AdminPage.tsx`: `ideaType` -> `contentType`, `idea_type` -> `content_type`, `total_ideas` -> `total_content`, `published_ideas` -> `published_content`, `recent_ideas` -> `recent_content`
- [x] 5.2 Update `AdminUserDetailPage.tsx`: `ideaType` -> `contentType`, `user.ideas` -> `user.content`, `idea.idea_type` -> `item.content_type`
- [x] 5.3 Update `MyDashboardPage.tsx`: `useMyIdeas` -> `useMyContent`, `IdeaRow` -> `ContentRow`, `myIdeas` -> `myContent`
- [x] 5.4 Update `MaterialPage.tsx`: `material.ideas` -> `material.contents`
- [x] 5.5 Update `PlannerPage.tsx`: `ideaId` -> `sessionId`, `ideaQuery` -> `sessionQuery`
- [x] 5.6 Update `CommandPalette.tsx`: `idea` keys -> `session` in icon/label maps

## 6. Frontend: Routes Cleanup

- [x] 6.1 Vereinfache Legacy-Redirects in `App.tsx`: `/idea/:slug` redirect und `/create/:ideaType` redirect beibehalten aber Variablennamen bereinigen

## 7. Verification

- [x] 7.1 Globale Suche nach verbleibenden `[Ii]dea` Referenzen (ausser IdeaOfTheWeek, Kommentare, Migrations, archived changes)
- [x] 7.2 Verify Pydantic/Zod Schema-Sync
- [x] 7.3 Verify Backend startet (`uv run python manage.py check`)
- [x] 7.4 Verify Frontend baut (`npm run build`)
