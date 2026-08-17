## 1. Backend-Fixes

- [x] 1.1 Add `city` field to `ParticipantOut` schema in `backend/event/schemas.py`
- [x] 1.2 Add `city` field to `PersonOut` schema in `backend/event/schemas.py` (if missing)
- [x] 1.3 Verify Day-Slot API parameter naming — check if `{slug}` vs `{event_slug}` is actually inconsistent in `backend/event/api.py` and fix if needed
- [x] 1.4 Run `uv run python manage.py check` — verify no issues

## 2. Frontend Schema + API Fixes

- [x] 2.1 Add `city` to `ParticipantSchema` in `frontend/src/schemas/event.ts`
- [x] 2.2 Add `city` to `PersonSchema` in `frontend/src/schemas/event.ts`
- [x] 2.3 Remove `useNutritionalTags()` from `frontend/src/api/events.ts` (broken, points to `/api/ideas/nutritional-tags/`)
- [x] 2.4 Fix `PersonsPage.tsx` import: change `useNutritionalTags` import from `events.ts` to `supplies.ts`
- [x] 2.5 Add `useUpdateBookingOption` hook to frontend (backend PUT/PATCH endpoint exists but no frontend hook)
- [x] 2.6 Run `npx tsc --noEmit` — verify no TypeScript errors from changes

## 3. Dead Code Removal

- [x] 3.1 Delete `frontend/src/pages/CreateIdeaPage.tsx`
- [x] 3.2 Delete `frontend/src/pages/RefurbishPage.tsx`
- [x] 3.3 Remove any remaining imports of `CreateIdeaPage` and `RefurbishPage` (grep codebase)
- [x] 3.4 Remove `IDEA_TYPE_OPTIONS` from `frontend/src/schemas/idea.ts` (no longer needed after dead page deletion — verify no other references first)
- [x] 3.5 Run `npx tsc --noEmit` — verify no TypeScript errors from deletions

## 4. AGENTS.md Verschlankung

- [x] 4.1 Slim down root `AGENTS.md` (~348 → ~80 lines): Keep only core principles, language rules, architecture decisions, workflow. Remove all feature documentation that belongs in OpenSpec specs.
- [x] 4.2 Slim down `backend/AGENTS.md` (~334 → ~60 lines): Keep only Django patterns, API conventions, build commands. Remove model/endpoint listings.
- [x] 4.3 Slim down `frontend/AGENTS.md` (~288 → ~80 lines): Keep only UI patterns, component conventions, state management rules. Remove page/component inventories.
- [x] 4.4 Delete `backend/event/AGENTS.md` (173 lines — entirely feature documentation, belongs in OpenSpec)
