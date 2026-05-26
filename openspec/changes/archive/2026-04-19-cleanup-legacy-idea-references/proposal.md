## Why

Die `idea` App wurde im Content/Supply-Refactor aufgelöst. Die Models, APIs und Schemas sind in die neuen Apps (`content`, `supply`, `session`, `blog`, `game`, `recipe`) migriert. Jedoch verwenden 128+ Frontend-Referenzen und 4 Backend-Dateien noch das alte "idea"-Naming (z.B. `MyIdeaOut`, `idea_type`, `useMyIdeas`, `IdeaRow`). Diese technische Schuld erschwert die Orientierung im Code und widerspricht der dokumentierten Architektur.

## What Changes

### Backend (4 Dateien)
- `content/admin_api.py`: Rename `TopIdeaOut` -> `TopContentOut`, `AdminUserIdeaOut` -> `AdminUserContentOut`, `RecentIdeaOut` -> `RecentContentOut`, `idea_type` Feld -> `content_type`, `total_ideas` -> `total_content`, `published_ideas` -> `published_content`, `top_ideas` -> `top_content`, `recent_ideas` -> `recent_content`
- `profiles/schemas/profile.py`: Rename `MyIdeaOut` alias -> `MyContentOut` direkt verwenden, `PublicIdeaOut` -> `PublicContentOut`
- `profiles/schemas/__init__.py`: Re-exports aktualisieren
- `profiles/api/profile.py`: Endpoint `/me/ideas/` -> `/me/content/` (mit Redirect)

### Frontend (11+ Dateien)
- Schema-Dateien: `idea_type` Feld -> `content_type`, `ideas` -> `contents`
- API-Hooks: `useMyIdeas` -> `useMyContent`, Query-Keys anpassen
- Pages: Variable und Komponentennamen (z.B. `IdeaRow` -> `ContentRow`)
- Routes: Legacy `/idea/:slug` Redirect und `/create/:ideaType` Redirect bereinigen
- Command Palette: `idea` keys in icon/label maps -> `session`

## Capabilities

### New Capabilities

Keine neuen Capabilities.

### Modified Capabilities

- `admin`: Admin-API Schema- und Feldnamen von "idea" zu "content" umbenennen
- `user-profiles`: `/me/ideas/` Endpoint zu `/me/content/` umbenennen

## Impact

- **Backend**: `content/admin_api.py`, `profiles/schemas/profile.py`, `profiles/schemas/__init__.py`, `profiles/api/profile.py`
- **Frontend**: `src/schemas/content.ts`, `src/schemas/supply.ts`, `src/schemas/profile.ts`, `src/api/profile.ts`, `src/api/search.ts`, `src/api/admin.ts`, `src/pages/AdminPage.tsx`, `src/pages/AdminUserDetailPage.tsx`, `src/pages/MyDashboardPage.tsx`, `src/pages/MaterialPage.tsx`, `src/pages/PlannerPage.tsx`, `src/pages/IdeaOfTheWeekPage.tsx`, `src/components/shared/CommandPalette.tsx`, `src/App.tsx`
- **Pydantic-Schemas**: `content/admin_api.py` Schemas, `profiles/schemas/profile.py` Schemas
- **Zod-Schemas**: `src/schemas/content.ts`, `src/schemas/supply.ts`, `src/schemas/profile.ts`
- **Keine DB-Migration nötig**: Nur Python-Klassen und TypeScript-Variablen werden umbenannt
