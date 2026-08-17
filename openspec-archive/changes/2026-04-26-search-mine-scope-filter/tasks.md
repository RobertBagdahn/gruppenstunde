# Tasks: search-mine-scope-filter

## 1. Backend: Search service

- [x] 1.1 In `backend/content/services/search_service.py` neue Funktion `apply_mine_filter(queryset, user, content_type)` einführen, die pro Typ die "meine"-Q-Objekte zurückgibt.
- [x] 1.2 Für `session`, `blog`, `game`: `Q(created_by=user) | Q(authors=user)`.
- [x] 1.3 Für `recipe`: `Q(owner=user) | Q(authors=user)`.
- [x] 1.4 Für `event`: `Q(created_by=user) | Q(responsible_persons=user) | Q(invited_users=user) | Q(invited_groups__in=user.groups.all()) | Q(registrations__user=user)` mit `.distinct()`.
- [x] 1.5 In `unified_search(...)` den `scope`-Parameter annehmen und bei `scope=mine` die Mine-Filter pro Typ anwenden.
- [x] 1.6 Bei `scope=mine` den Status-Filter so lockern, dass DRAFT für mine-matching items sichtbar ist (status='approved' OR mine).
- [x] 1.7 Event-Ergebnisse immer mit `is_template=False` filtern (auch bei `scope=all`).
- [x] 1.8 Bei anonymem User und `scope=mine`: Parameter ignorieren (als `all` behandeln) — keine 401, damit öffentliche Links nicht brechen.

## 2. Backend: API + Schemas

- [x] 2.1 In `backend/content/api/search.py` den `scope`-Query-Parameter im Endpunkt-Signature ergänzen (`scope: Literal['all','mine'] = 'all'`).
- [x] 2.2 Falls ein `SearchRequest`-Pydantic-Schema existiert in `backend/content/schemas/search.py`: Feld `scope` ergänzen.
- [x] 2.3 API an `unified_search` durchreichen.

## 3. Backend: Tests

- [x] 3.1 Test: `scope=mine&type=session` liefert nur Sessions wo `created_by=user` oder `authors=user`.
- [x] 3.2 Test: `scope=mine&type=event` liefert Events aus allen 5 Relations-Pfaden, dedupliziert.
- [x] 3.3 Test: Draft-Leak — User B darf keine Drafts von User A sehen, auch mit `scope=mine`.
- [x] 3.4 Test: Templates (`is_template=True`) werden bei `scope=all` UND `scope=mine` ausgeschlossen.
- [x] 3.5 Test: Anonymer User mit `scope=mine` bekommt gleiches Ergebnis wie `scope=all`.

## 4. Frontend: Schema + API-Client

- [x] 4.1 In `frontend/src/schemas/search.ts` den Request-Zod-Schema erweitern: `scope: z.enum(['all','mine']).optional()`.
- [x] 4.2 In `frontend/src/api/search.ts` den `scope`-Parameter an den Query-String anhängen (nur wenn `mine`, nicht als Default).
- [x] 4.3 Prüfen ob ein `useSearch`-Hook existiert (TanStack Query) — falls ja, `scope` in Cache-Key aufnehmen.

## 5. Frontend: SearchPage UI

- [x] 5.1 In `frontend/src/pages/SearchPage.tsx` `useAuth()` einbinden und ermitteln ob User angemeldet ist.
- [x] 5.2 Im Filter-Bereich (aktuell Z. ~310-323 neben Sort) einen shadcn/ui `Switch` mit Label "Nur meine Beiträge" rendern, sichtbar nur für eingeloggte User.
- [x] 5.3 Switch-State aus URL-Param `scope` ableiten (`scope==='mine'` → on).
- [x] 5.4 Switch-Änderung schreibt `?scope=mine` bzw. entfernt den Param.
- [x] 5.5 Falls anonymer User URL mit `scope=mine` aufruft: Param ignorieren, nicht an API durchreichen.
- [x] 5.6 Result-Cards: Bei `status==='draft'` einen "Entwurf"-Badge einblenden (shadcn `Badge variant="outline"`).

## 6. Dokumentation

- [x] 6.1 In `backend/AGENTS.md` unter Search-Konventionen die `scope`-Semantik kurz beschreiben (Verweis auf Spec).
- [x] 6.2 In `frontend/AGENTS.md` unter Search-Konventionen den Mine-Toggle + URL-State erwähnen.

## 7. Verifikation

- [x] 7.1 `openspec validate search-mine-scope-filter --strict` läuft durch.
- [ ] 7.2 Manueller Test: Eingeloggter User sieht eigene Drafts, Anonymer sieht keinen Toggle, Event-Einladung taucht mit `scope=mine` auf.
- [x] 7.3 Pydantic- und Zod-Schema synchron (AGENTS.md Pflicht-Check).
