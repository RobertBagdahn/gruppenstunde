## Why

Angemeldete User haben keinen schnellen Weg, in der globalen Suche nur ihre eigenen Beiträge zu finden. Aktuell muss man pro Tool-Seite (Recipes hat `origin=mine`, andere Tools haben gar nichts) separat filtern. Ein einheitlicher `scope`-Filter im globalen Search-Endpunkt löst das für alle indizierten Content-Typen (Session, Blog, Game, Recipe, Event) konsistent.

Zusätzlich fehlen User-Relationen für Events (Einladung, Anmeldung, Verantwortlichkeit) komplett in der Filterlogik — "meine Events" ist aktuell nur `created_by=me`, obwohl User auch eingeladen oder angemeldet sein können.

## What Changes

- **Backend**: `/api/content/search/` bekommt neuen Query-Parameter `scope` mit Werten `all` (Default) und `mine`. Bei `scope=mine` wird pro Content-Typ umfassend gefiltert:
  - Session/Blog/Game: `created_by=user OR authors=user`
  - Recipe: `owner=user OR authors=user`
  - Event: `created_by OR responsible_persons OR invited_users OR (invited_groups ∩ user.groups) OR Registration exists`
- **Draft-Sichtbarkeit**: Bei `scope=mine` werden auch DRAFT-Status-Items zurückgegeben (bricht die bestehende "nur APPROVED"-Invariante bewusst für Eigentümer-Sicht).
- **Templates**: Events mit `is_template=True` werden in jedem Fall aus der Search ausgeschlossen (auch bei `scope=mine`).
- **Frontend**: `SearchPage` bekommt einen Toggle-Switch "Nur meine Beiträge" neben dem Sort-Control. Toggle nur sichtbar für eingeloggte User. URL-State über `scope=mine`.
- **Zod-Schema**: `search.ts` erweitert um `scope: z.enum(['all','mine']).optional()`.
- **TanStack Query**: `useSearch`-Hook akzeptiert `scope`-Parameter, Cache-Key inkludiert scope.
- **Nicht im Scope**: Planner, MealPlan, Material, Ingredient (nicht im globalen Search indiziert).

## Impact

- **Affected specs**: `search` (MODIFIED — Unified Global Search, ADDED — Mine-Scope-Filter)
- **Affected code**:
  - `backend/content/services/search_service.py` (neue `scope`-Parameter, Filter-Logik pro Typ)
  - `backend/content/api/search.py` (Query-Param)
  - `backend/content/schemas/search.py` (Request-Schema)
  - `frontend/src/schemas/search.ts` (Zod)
  - `frontend/src/api/search.ts` (API-Client)
  - `frontend/src/hooks/useSearch.ts` (Query-Hook, falls vorhanden)
  - `frontend/src/pages/SearchPage.tsx` (Toggle-UI)
- **Breaking**: Nein (Default `scope=all` bleibt bestehendes Verhalten)
- **Performance**: Mine-Filter nutzt bestehende Indizes auf `created_by`, `authors`, `owner`. Event-Filter erfordert zusätzliche JOINs auf Registration/invited_users/invited_groups — mit Prefetch/Subquery lösen.
