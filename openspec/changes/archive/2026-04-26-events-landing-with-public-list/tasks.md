## 1. Backend: Public landing endpoint

- [x] 1.1 Add `public_landing_events` query helper in `backend/event/api/events.py` (or similar): filters `is_public=True, is_template=False`, orders by `start_date` with upcoming preferred, limits to 12
- [x] 1.2 Register endpoint `GET /api/events/public-landing/` (unauthenticated) returning a flat list using the existing Pydantic event schema (reuse, do not create a new one)
- [x] 1.3 Add DB index on `(is_public, is_template, start_date)` if not already present (check via `uv run python manage.py sqlmigrate` equivalent)
- [x] 1.4 Write a unit test in `backend/event/tests/` covering: only public events returned, templates excluded, upcoming-first ordering, empty state returns `[]`

## 2. Frontend: Shared UnauthGate component

- [x] 2.1 Create `frontend/src/components/shared/UnauthGate.tsx` accepting `title`, `description`, optional `ctaLabel`, optional `ctaRoute` props
- [x] 2.2 Component renders a centered card with lock/person icon, text, and two buttons ("Anmelden", "Kostenlos registrieren")
- [x] 2.3 Mobile-first styling with Tailwind (320px minimum)

## 3. Frontend: Events landing page with public events

- [x] 3.1 Add TanStack Query hook `usePublicLandingEvents()` in `frontend/src/api/events.ts` calling the new endpoint; Zod schema reuses the existing event list schema
- [x] 3.2 Rewrite `frontend/src/pages/tools/EventsLandingPage.tsx`: at the top fetch public events; if list has items, render hero + event list grid + registration CTA; if list is empty, render the existing `ToolLandingPage` as fallback
- [x] 3.3 Event cards in the list SHALL link to `/events/:id` (event detail), consistent with the authenticated dashboard
- [x] 3.4 Ensure loading state shows skeleton loaders, not a spinner flash

## 4. Frontend: Planner & Meal-plan unauth states

- [x] 4.1 In `frontend/src/pages/PlannerPage.tsx` detect unauthenticated state via `useCurrentUser()` and render `<UnauthGate title="Gruppenstundenplan" description="Melde dich an, um deine Gruppenstunden zu planen." />` before any API call
- [x] 4.2 In `frontend/src/pages/planning/MealEventListPage.tsx` replace the existing inline auth message with `<UnauthGate title="Essenspläne" description="Melde dich an, um deine Essenspläne zu verwalten." />`

## 5. Verification

- [x] 5.1 Test `/events` as anonymous user with public events present (list shown), without public events (marketing fallback), and as authenticated user (dashboard unchanged)
- [x] 5.2 Test `/session-planner/app` and `/meal-plans/app` as anonymous user (friendly gate), no 403 in network tab
- [x] 5.3 Verify Zod schema stays synchronous with Pydantic for the public-landing response
