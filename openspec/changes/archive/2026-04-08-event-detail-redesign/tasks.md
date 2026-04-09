## 1. Backend: Event Model & Migration

- [x] 1.1 Add `ParticipantVisibilityChoices` to `backend/event/choices.py` with values: `none`, `total_only`, `per_option`, `with_names`
- [x] 1.2 Add `participant_visibility` field to `Event` model in `backend/event/models/core.py` (CharField with choices, default `none`)
- [x] 1.3 Add `compute_phase()` method to `Event` model that returns the current phase based on date fields (`draft`, `pre_registration`, `registration`, `pre_event`, `running`, `completed`)
- [x] 1.4 Run `uv run python manage.py makemigrations event` and verify migration
- [x] 1.5 Run `uv run python manage.py migrate`

## 2. Backend: Pydantic Schemas

- [x] 2.1 Add `EventPhase` string enum to `backend/event/schemas/core.py`
- [x] 2.2 Add `ParticipantStatsOut` schema with `total`, `by_option` (list of option stats), and optional `participants` (list of first names per option)
- [x] 2.3 Add `UserRegistrationOut` schema with `is_registered`, `registration_id`, `participant_count`
- [x] 2.4 Add `InvitationCountsOut` schema with `total`, `accepted`, `pending`
- [x] 2.5 Extend `EventDetailOut` with new fields: `phase`, `participant_stats` (optional), `user_registration` (optional), `invitation_counts` (optional), `participant_visibility`
- [x] 2.6 Extend `EventListOut` with `phase` and `is_registered` fields
- [x] 2.7 Extend `EventUpdateIn` to accept `participant_visibility`
- [x] 2.8 Add `InvitationStatusOut` schema with `user_id`, `first_name`, `last_name`, `email`, `scout_name`, `status`, `invited_via`, `group_name`
- [x] 2.9 Add `PaginatedInvitationStatusOut` schema

## 3. Backend: API Endpoints

- [x] 3.1 Update `GET /api/events/` to include `phase` (computed) and `is_registered` (for authenticated users) in each event
- [x] 3.2 Update `GET /api/events/{slug}/` to include `phase`, `participant_stats` (based on `participant_visibility` and user role), `user_registration`, and `invitation_counts` (for managers only)
- [x] 3.3 Update `PATCH /api/events/{slug}/` to accept `participant_visibility` field
- [x] 3.4 Create new endpoint `GET /api/events/{slug}/invitations/` in `backend/event/api/events.py` — returns paginated list of invited users with status (accepted/pending), supports `?status=` and `?search=` filters, requires manager role
- [x] 3.5 Add participant visibility choices endpoint `GET /api/events/choices/participant-visibility/`

## 4. Frontend: Zod Schemas

- [x] 4.1 Add `EventPhase` enum/literal type to `frontend/src/schemas/event.ts`
- [x] 4.2 Add `ParticipantStats`, `UserRegistration`, `InvitationCounts` Zod schemas
- [x] 4.3 Extend `EventDetail` schema with `phase`, `participantStats`, `userRegistration`, `invitationCounts`, `participantVisibility`
- [x] 4.4 Extend `EventList` schema with `phase` and `isRegistered`
- [x] 4.5 Add `InvitationStatus` Zod schema and paginated variant

## 5. Frontend: API Hooks

- [x] 5.1 Update `useEvents` hook to return events with `phase` and `isRegistered`
- [x] 5.2 Update `useEvent` hook return type to include new detail fields
- [x] 5.3 Add `useEventInvitations` hook in `frontend/src/api/events.ts` for `GET /api/events/{slug}/invitations/` with status/search params
- [x] 5.4 Add `useParticipantVisibilityChoices` hook

## 6. Frontend: Phase Timeline Component

- [x] 6.1 Create `PhaseTimeline` component in `frontend/src/components/events/PhaseTimeline.tsx`
- [x] 6.2 Implement horizontal stepper layout for desktop (connected circles with labels and dates)
- [x] 6.3 Implement vertical stepper layout for mobile (< 768px)
- [x] 6.4 Add phase color coding: draft=gray, pre_registration=yellow, registration=green, pre_event=blue, running=purple, completed=muted
- [x] 6.5 Add German labels mapping (draft→"Erstellt", registration→"Anmeldephase", etc.)
- [x] 6.6 Handle missing date phases (skip steps without corresponding dates)

## 7. Frontend: Event List Redesign

- [x] 7.1 Remove sidebar detail panel from `EventsPage.tsx` (remove `EventDetailView` inline usage and split-panel layout)
- [x] 7.2 Create compact `EventCard` component with phase badge, date, location, registration status icon
- [x] 7.3 Implement responsive grid layout (1 column mobile, 2-3 columns desktop)
- [x] 7.4 Add phase badge component (color-coded pill/badge)
- [x] 7.5 Update event card click to navigate to `/events/app/{slug}` instead of inline detail
- [x] 7.6 Extract inline components from `EventsPage.tsx` into separate files (EventDetailView, RegisterForm, etc.) for reuse in tabs

## 8. Frontend: Unified Tab-Based Detail Page

- [x] 8.1 Refactor `EventDashboardPage.tsx` to support role-based tab configuration (member tabs + admin tabs)
- [x] 8.2 Implement tab visibility logic: filter tabs based on `event.userRegistration` and manager role
- [x] 8.3 Add visual separator between member tabs and admin tabs
- [x] 8.4 Keep URL-driven tab state (`?tab=` parameter) with default `overview`
- [x] 8.5 Add mobile horizontally scrollable tab bar

## 9. Frontend: Member Tabs

- [x] 9.1 Create `MemberOverviewTab` component: registration status card, phase timeline, event summary, contact persons, conditional participant stats
- [x] 9.2 Create `RegistrationTab` component: registration form (reuse/extract from EventsPage), update registration, unregister button with confirm dialog, phase-aware disabled state
- [x] 9.3 Create `ParticipantsTab` (member version): display based on `participantVisibility` — total count, per-option breakdown, or first names
- [x] 9.4 Create `InvitationTextTab` component: MarkdownRenderer for members, MarkdownEditor toggle for managers
- [x] 9.5 Create `PackingListTab` component: read-only packing list display for members, edit button for managers

## 10. Frontend: Admin-Only Tabs

- [x] 10.1 Create `InvitationsTab` component: paginated list of invited users with status badges, filter buttons (Alle/Zugesagt/Offen with counts), search field
- [x] 10.2 Integrate existing dashboard tabs (ParticipantsTab → "Verwaltung", PaymentsTab, TimelineTab, MailTab, ExportTab)
- [x] 10.3 Update `SettingsTab` to include participant visibility configuration (radio group or select)

## 11. Frontend: Route Updates

- [x] 11.1 Update `EventDetailPage.tsx` (`/events/:slug`) to redirect to `/events/app/:slug`
- [x] 11.2 Verify route definitions in router config match new navigation pattern

## 12. Schema Sync Verification

- [x] 12.1 Verify Pydantic `EventDetailOut` and Zod `EventDetail` schemas are in sync
- [x] 12.2 Verify Pydantic `EventListOut` and Zod `EventList` schemas are in sync
- [x] 12.3 Verify Pydantic `InvitationStatusOut` and Zod `InvitationStatus` schemas are in sync

## 13. Testing

- [x] 13.1 Test `Event.compute_phase()` method with various date combinations
- [x] 13.2 Test `GET /api/events/{slug}/invitations/` endpoint with filters
- [x] 13.3 Test `participant_stats` in event detail response for each visibility level
- [x] 13.4 Test `is_registered` field in event list response for authenticated/unauthenticated users
- [x] 13.5 Test `participant_visibility` update via PATCH
