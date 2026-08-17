## 1. Backend: Event model helper

- [x] 1.1 Add method `Event.user_is_personally_invited(user) -> bool` in `backend/event/models/core.py` that returns True iff user is in `invited_users` OR in a group present in `invited_groups`; excludes `responsible_persons` and `created_by`
- [x] 1.2 Add unit tests covering: direct invite, group invite, manager-only (should be False), anonymous user (should be False), overlapping cases

## 2. Backend: List endpoint extension

- [x] 2.1 In `backend/event/api/events.py:list_events`, extend the QuerySet with `prefetch_related('invited_users', 'invited_groups')`
- [x] 2.2 Load the authenticated user's group IDs once per request (`user.groupmemberships.values_list('group_id', flat=True)`) before iterating events
- [x] 2.3 For each event, set `_is_invited` (analog zu bestehendem `_is_registered`) by evaluating membership in prefetched M2M sets in Python (no extra queries)
- [x] 2.4 For anonymous users, always set `_is_invited = False`

## 3. Backend: Pydantic schema

- [x] 3.1 Add `is_invited: bool = False` to the event list Pydantic schema (wherever `is_registered` is defined — likely `backend/event/schemas/events.py`)
- [x] 3.2 Ensure the serialization in `list_events` maps the internal `_is_invited` attribute to the schema field

## 4. Frontend: Zod schema

- [x] 4.1 Add `is_invited: z.boolean()` to the event list schema in `frontend/src/schemas/event.ts` (all three schema exports that currently have `is_registered`)
- [x] 4.2 Verify TypeScript types derived from Zod now include the new field throughout `EventsPage` consumption

## 5. Frontend: EventCard badge priority

- [x] 5.1 In `frontend/src/pages/EventsPage.tsx` (`EventCard` component around lines 91-104), implement the four-case priority logic described in the spec
- [x] 5.2 Add new badge variant "Anmeldung steht aus" using Tailwind amber tokens and Material Symbols icon `pending_actions`
- [x] 5.3 Extract the badge logic into a small helper `getEventStatusBadge(event)` returning `{ label, icon, classes } | null` for testability and reuse
- [x] 5.4 Ensure only one status badge renders per card; the separate `PhaseBadge` stays unchanged

## 6. Verification

- [x] 6.1 Backend test: `GET /api/events/` response includes `is_invited` for authenticated users with correct values across scenarios
- [x] 6.2 Manual UI check: an invited-but-not-registered user sees amber "Anmeldung steht aus" on the relevant card
- [x] 6.3 Manual UI check: after registering, the same card switches to green "Angemeldet"
- [x] 6.4 Manual UI check: anonymous user sees no invited-status (only public events, either "Anmeldung offen" or no status badge)
