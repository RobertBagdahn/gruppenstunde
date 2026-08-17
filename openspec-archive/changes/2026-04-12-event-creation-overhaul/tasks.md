## 1. Backend: Model-Erweiterungen & Migrationen

- [x] 1.1 Add `EventColorChoices` (15 Tailwind-Farben) and `EventIconChoices` (30+ verifizierte Lucide-Icons, `flame` statt `campfire`) and `EventPhaseChoices` as TextChoices to `backend/event/choices.py`
- [x] 1.2 Add `color` (CharField(20), choices=EventColorChoices, default=BLUE), `icon` (CharField(30), choices=EventIconChoices, default=TENT), `is_template` (BooleanField, default=False), `manual_phase` (CharField(20), choices=EventPhaseChoices, null=True, blank=True) fields to Event model in `backend/event/models/core.py`
- [x] 1.3 Add `meal_plan` FK (to `"planner.MealEvent"`, null=True, blank=True, on_delete=SET_NULL) to Event model in `backend/event/models/core.py`
- [x] 1.4 Update `Event.compute_phase()` to check `manual_phase` first — if set, return it; otherwise use existing time-based logic
- [x] 1.5 Add `latitude` (FloatField, null=True, blank=True), `longitude` (FloatField, null=True, blank=True) fields to EventLocation model in `backend/event/models/core.py`
- [x] 1.6 Add `latitude` (FloatField, null=True, blank=True), `longitude` (FloatField, null=True, blank=True) fields to MeetingPoint model in `backend/event/models/core.py`
- [x] 1.7 Create WaitlistEntry model in `backend/event/models/waitlist.py` (event FK CASCADE, booking_option FK CASCADE, user FK CASCADE, person FK **SET_NULL** null=True, created_at, notified_at, expired_at)
- [x] 1.8 Create AttendanceRecord model in `backend/event/models/attendance.py` (participant FK CASCADE, checked_in_at nullable, checked_out_at nullable, checked_in_by FK SET_NULL)
- [x] 1.9 Create RoomAssignment model in `backend/event/models/room_assignment.py` (event FK CASCADE, name CharField(100), capacity IntegerField default=0, description TextField blank, sort_order IntegerField, participants M2M Participant)
- [x] 1.10 Create ParentAccessToken model in `backend/event/models/parent_access.py` (participant FK CASCADE, token UUIDField unique default=uuid4, created_at auto_now_add, expires_at DateTimeField, email CharField)
- [x] 1.11 Create BudgetItem model in `backend/event/models/budget.py` (event FK CASCADE, description CharField, amount DecimalField(7,2), category CharField choices: material/food/transport/venue/other, is_expense BooleanField default=True, created_by FK SET_NULL, created_at auto_now_add)
- [x] 1.12 Export all new models in `backend/event/models/__init__.py` (add to imports AND `__all__`)
- [x] 1.13 Run `uv run python manage.py makemigrations event` and `uv run python manage.py migrate`

## 2. Backend: Pydantic Schema-Erweiterungen

- [x] 2.1 Extend EventCreateIn schema with `color`, `icon`, `is_template`, `manual_phase` (optional), `group_id` (optional), `invited_user_ids` (optional list), `meal_plan_id` (optional) in `backend/event/schemas/core.py`
- [x] 2.2 Extend EventOut/EventDetailOut/EventListOut schemas with `color`, `icon`, `is_template`, `manual_phase`, `meal_plan_id` fields in `backend/event/schemas/core.py`
- [x] 2.3 Extend EventUpdateIn schema with `color`, `icon`, `is_template`, `manual_phase`, `meal_plan_id` fields in `backend/event/schemas/core.py`
- [x] 2.4 Extend EventLocationOut, EventLocationCreateIn, EventLocationUpdateIn schemas with `latitude`, `longitude` in `backend/event/schemas/core.py`
- [x] 2.5 Extend MeetingPointOut, MeetingPointCreateIn, MeetingPointUpdateIn schemas with `latitude`, `longitude` in `backend/event/schemas/core.py`
- [x] 2.6 Create WaitlistEntryOut, WaitlistEntryCreateIn schemas in `backend/event/schemas/waitlist.py`
- [x] 2.7 Create AttendanceRecordOut, AttendanceRecordCreateIn schemas in `backend/event/schemas/attendance.py`
- [x] 2.8 Create ChecklistItemOut and ChecklistOut schemas in `backend/event/schemas/checklist.py`
- [x] 2.9 Create RoomAssignmentOut, RoomAssignmentCreateIn, RoomAssignmentUpdateIn schemas in `backend/event/schemas/room_assignment.py`
- [x] 2.10 Create ParentAccessTokenOut, ParentAccessTokenCreateIn schemas in `backend/event/schemas/parent_access.py`
- [x] 2.11 Create BudgetItemOut, BudgetItemCreateIn, BudgetSummaryOut schemas in `backend/event/schemas/budget.py`
- [x] 2.12 Create ImportPreviewOut, ImportResultOut schemas in `backend/event/schemas/import_data.py`
- [x] 2.13 Export all new schemas in `backend/event/schemas/__init__.py`

## 3. Backend: Neue API-Endpunkte (ROUTE ORDER BEACHTEN)

- [x] 3.1 Add `GET /api/events/check-slug/?slug=...` endpoint returning `{available, suggestion}` — MUST be defined BEFORE `/{event_slug}/` route in `backend/event/api/events.py`
- [x] 3.2 Add `GET /api/events/templates/` endpoint for listing template events (paginated, own only) — MUST be defined BEFORE `/{event_slug}/` route in `backend/event/api/events.py`
- [x] 3.3 Update `GET /api/events/` list endpoint to exclude templates by default (`.exclude(is_template=True)`) in `backend/event/api/events.py`
- [x] 3.4 Add `POST /api/events/{slug}/duplicate/` endpoint for deep-copying events with optional `date_shift_weeks` parameter in `backend/event/api/events.py`
- [x] 3.5 Modify `POST /api/events/` to accept optional `group_id` and `invited_user_ids` for invite-at-creation in `backend/event/api/events.py`
- [x] 3.6 Update `Event.save()` to respect user-provided slug while still validating uniqueness in `backend/event/models/core.py`
- [x] 3.7 Add `GET /api/events/{slug}/checklist/` endpoint returning publish readiness checklist in `backend/event/api/checklist.py`
- [x] 3.8 Create waitlist API endpoints in `backend/event/api/waitlist.py`: POST (join), GET (list, manager only, paginated), DELETE (remove)
- [x] 3.9 Create attendance API endpoints in `backend/event/api/attendance.py`: POST (check-in), POST batch, PATCH (check-out), GET (list, manager only, paginated)
- [x] 3.10 Create room assignment API endpoints in `backend/event/api/room_assignment.py`: CRUD + PATCH assign/unassign participants
- [x] 3.11 Create parent access token API endpoints in `backend/event/api/parent_access.py`: POST (generate), POST batch, GET (list), DELETE (revoke)
- [x] 3.12 Create budget API endpoints in `backend/event/api/budget.py`: GET summary, CRUD for BudgetItems
- [x] 3.13 Create participant import endpoint in `backend/event/api/import_data.py`: POST preview, POST import (multipart CSV/Excel)
- [x] 3.14 Register all new sub-routers on `event_router` via `from .module import *` in `backend/event/api/__init__.py`

## 4. Backend: Services & Business Logic

- [x] 4.1 Create waitlist service in `backend/event/services/waitlist.py` — auto-notify next person on participant removal, 48h expiration logic
- [x] 4.2 Create attendance service in `backend/event/services/attendance.py` — batch check-in, timeline entry creation
- [x] 4.3 Create checklist service in `backend/event/services/checklist.py` — compute readiness items (name, dates, booking options, registration dates, location)
- [x] 4.4 Create event duplication service in `backend/event/services/duplication.py` — deep copy logic with unique slug generation and date_shift_weeks support
- [x] 4.5 Create participant import service in `backend/event/services/import_data.py` — CSV/Excel parsing, column mapping, Person creation, Registration creation
- [x] 4.6 Create parent access service in `backend/event/services/parent_access.py` — token generation, batch generation, email sending, expiration check
- [x] 4.7 Create budget service in `backend/event/services/budget.py` — compute income/expected/expenses summary
- [x] 4.8 Update timeline service to log attendance events (check-in, check-out) and import events in `backend/event/services/timeline.py`
- [x] 4.9 Add `attendance_check_in`, `attendance_check_out`, `participants_imported` action types to TimelineActionChoices in `backend/event/choices.py`
- [x] 4.10 Update invitation PDF service to include QR code (using Python `qrcode` library) in `backend/event/services/invitation_pdf.py`

## 5. Backend: Parent Access View

- [x] 5.1 Create parent access page view at `/events/{slug}/parent/{token}` — serves data for unauthenticated parent view (can be API endpoint returning JSON for SPA or SSR page)

## 6. Frontend: Dependencies & Setup

- [x] 6.1 Install `react-leaflet`, `leaflet`, `@types/leaflet` via npm in `frontend/`
- [x] 6.2 Install `react-hook-form`, `@hookform/resolvers` via npm in `frontend/`
- [x] 6.3 Install `qrcode.react` via npm in `frontend/`
- [x] 6.4 Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` via npm in `frontend/`
- [x] 6.5 Create lazy-loaded MapView component in `frontend/src/components/shared/MapView.tsx` using react-leaflet with OpenStreetMap tiles
- [x] 6.6 Create geocoding utility using Nominatim API with debouncing (1s) and LocalStorage caching in `frontend/src/utils/geocoding.ts`

## 7. Frontend: Zod Schema-Sync

- [x] 7.1 Extend EventCreate, EventOut, EventUpdate Zod schemas with `color`, `icon`, `isTemplate`, `manualPhase`, `mealPlanId` in `frontend/src/schemas/event.ts`
- [x] 7.2 Extend EventLocation and MeetingPoint Zod schemas with `latitude`, `longitude` (z.number().nullable().optional()) in `frontend/src/schemas/event.ts`
- [x] 7.3 Add WaitlistEntry Zod schemas (WaitlistEntrySchema, WaitlistEntryCreateSchema) in `frontend/src/schemas/event.ts`
- [x] 7.4 Add AttendanceRecord Zod schemas in `frontend/src/schemas/event.ts`
- [x] 7.5 Add Checklist Zod schemas in `frontend/src/schemas/event.ts`
- [x] 7.6 Add slug check response schema (`z.object({ available: z.boolean(), suggestion: z.string() })`) in `frontend/src/schemas/event.ts`
- [x] 7.7 Add RoomAssignment Zod schemas in `frontend/src/schemas/event.ts`
- [x] 7.8 Add ParentAccessToken Zod schemas in `frontend/src/schemas/event.ts`
- [x] 7.9 Add BudgetItem and BudgetSummary Zod schemas in `frontend/src/schemas/event.ts`
- [x] 7.10 Add ImportPreview and ImportResult Zod schemas in `frontend/src/schemas/event.ts`
- [x] 7.11 Create wizard step Zod schemas (one per step) in `frontend/src/schemas/eventWizard.ts`

## 8. Frontend: TanStack Query Hooks

- [x] 8.1 Add `useCheckSlug` hook (debounced GET /api/events/check-slug/) in `frontend/src/api/events.ts`
- [x] 8.2 Add `useDuplicateEvent` mutation hook in `frontend/src/api/events.ts`
- [x] 8.3 Add `useEventTemplates` query hook in `frontend/src/api/events.ts`
- [x] 8.4 Add `useEventChecklist` query hook in `frontend/src/api/eventDashboard.ts`
- [x] 8.5 Add waitlist hooks (useJoinWaitlist, useWaitlist, useRemoveFromWaitlist) in `frontend/src/api/eventDashboard.ts`
- [x] 8.6 Add attendance hooks (useCheckIn, useCheckOut, useBatchCheckIn, useAttendanceList) in `frontend/src/api/eventDashboard.ts`
- [x] 8.7 Add room assignment hooks (useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, useAssignParticipant, useUnassignParticipant) in `frontend/src/api/eventDashboard.ts`
- [x] 8.8 Add parent access hooks (useParentTokens, useCreateParentToken, useBatchCreateParentTokens, useRevokeParentToken) in `frontend/src/api/eventDashboard.ts`
- [x] 8.9 Add budget hooks (useBudgetSummary, useBudgetItems, useCreateBudgetItem, useUpdateBudgetItem, useDeleteBudgetItem) in `frontend/src/api/eventDashboard.ts`
- [x] 8.10 Add import hooks (useImportPreview, useImportParticipants) in `frontend/src/api/eventDashboard.ts`

## 9. Frontend: Event-Erstellungswizard (Neubau)

- [x] 9.1 Create Zustand store for wizard state in `frontend/src/store/eventWizardStore.ts` (store/ SINGULAR!) — holds all step data, current step, validation state
- [x] 9.2 Create WizardStepper component (progress indicator with step labels) in `frontend/src/components/events/wizard/WizardStepper.tsx`
- [x] 9.3 Create Step 1: Grunddaten (name with slug preview, color picker, icon picker, description) in `frontend/src/components/events/wizard/StepBasicData.tsx`
- [x] 9.4 Create ColorPicker component (15 predefined Tailwind colors as selectable circles, matching EventColorChoices) in `frontend/src/components/events/wizard/ColorPicker.tsx`
- [x] 9.5 Create IconPicker component (30+ verified Lucide icons in grid layout, `flame` NOT `campfire`) in `frontend/src/components/events/wizard/IconPicker.tsx`
- [x] 9.6 Create SlugEditor component (auto-generated slug with edit mode and debounced uniqueness check via useCheckSlug) in `frontend/src/components/events/wizard/SlugEditor.tsx`
- [x] 9.7 Create Step 2: Gruppe & Einladung (optional group selector, person invitation) in `frontend/src/components/events/wizard/StepGroupInvitation.tsx`
- [x] 9.8 Create Step 3: Datum & Ort (date pickers with smart defaults, location picker with inline map, meeting points) in `frontend/src/components/events/wizard/StepDateLocation.tsx`
- [x] 9.9 Create Step 4: Anmeldung (registration period, visibility, guest registration toggle, deadline) in `frontend/src/components/events/wizard/StepRegistration.tsx`
- [x] 9.10 Create Step 5: Buchungsoptionen (add/remove options with price, max participants, bookable period) in `frontend/src/components/events/wizard/StepBookingOptions.tsx`
- [x] 9.11 Create Step 6: Packliste & Felder (packing list selector, custom fields creator, labels creator) in `frontend/src/components/events/wizard/StepPackingFields.tsx`
- [x] 9.12 Create Step 7: Einladungstext (Markdown editor, AI generation, preview) in `frontend/src/components/events/wizard/StepInvitationText.tsx`
- [x] 9.13 Create Step 8: Zusammenfassung (overview of all settings, publish checklist, create button) in `frontend/src/components/events/wizard/StepSummary.tsx`
- [x] 9.14 Create StepContextHelp component (explanation text per step) in `frontend/src/components/events/wizard/StepContextHelp.tsx`
- [x] 9.15 Rewrite `frontend/src/pages/NewEventPage.tsx` to use new wizard components with 8-step flow, react-hook-form + Zod validation per step
- [x] 9.16 Add "Aus Vorlage erstellen" option to Step 1 that loads template data into wizard store

## 10. Frontend: Dashboard Tab-Konsolidierung

- [x] 10.1 Rewrite `EventDashboardPage.tsx` tab structure from 12 tabs to 7 tabs (Übersicht, Teilnehmende, Einladung & Gäste, Packliste, Zahlungen, Aktivität, Einstellungen)
- [x] 10.2 Merge OverviewTab + RegistrationTab into new combined OverviewTab (registration form/status inline, phase guidance, checklist card, budget card)
- [x] 10.3 Merge MemberParticipantsTab + ParticipantsTab into single ParticipantsTab with role toggle (member view vs admin view)
- [x] 10.4 Merge InvitationTextTab + InvitationsTab into single InvitationGuestsTab
- [x] 10.5 Merge TimelineTab + MailTab + ExportTab into single ActivityTab
- [x] 10.6 Create FilterBar component for participants (booking option, payment status, label, name search) in `frontend/src/components/events/dashboard/FilterBar.tsx`
- [x] 10.7 Add filters to Zahlungen tab (payment method, date range)
- [x] 10.8 Add filters to Aktivität tab (action type, date range)
- [x] 10.9 Make all filters URL-driven via query parameters (?tab=participants&booking-option=1&payment-status=paid)
- [x] 10.10 Ensure tab bar is scrollable on mobile (horizontal scroll with overflow-x-auto)

## 11. Frontend: Phase Guidance

- [x] 11.1 Create PhaseGuidanceBanner component with per-phase German text, action instructions, and action links in `frontend/src/components/events/PhaseGuidanceBanner.tsx`
- [x] 11.2 Replace generic "Das Event befindet sich noch im Entwurf" info banner with PhaseGuidanceBanner in OverviewTab
- [x] 11.3 Add colored Alert variants per phase (draft=amber, pre_registration=blue, registration=green, pre_event=orange, running=violet, completed=slate)

## 12. Frontend: Publish Checklist

- [x] 12.1 Create ChecklistCard component (progress bar, green/red items, links to settings) in `frontend/src/components/events/dashboard/ChecklistCard.tsx`
- [x] 12.2 Integrate ChecklistCard into combined OverviewTab

## 13. Frontend: Location Detail & Map

- [x] 13.1 Create LocationDetailDialog component (fullscreen map, address, description, OpenStreetMap routing link) in `frontend/src/components/events/LocationDetailDialog.tsx`
- [x] 13.2 Make EventLocation and MeetingPoint clickable in OverviewTab — onClick opens LocationDetailDialog
- [x] 13.3 Add inline map preview in wizard Step 3 (Datum & Ort) when location has coordinates
- [x] 13.4 Add geocoding button to location creation/edit forms — resolves address to coordinates via Nominatim
- [x] 13.5 Add draggable pin on map in location edit mode to manually adjust coordinates

## 14. Frontend: Event Landing Page Redesign

- [x] 14.1 Redesign `EventsPage.tsx` for authenticated users: dashboard-style layout with sections (Meine Events, Eingeladene Events, Letzte Aktivitäten)
- [x] 14.2 Add Quick-Action cards ("Neues Event erstellen", "Meine Events", "Eingeladene Events", "Vorlagen", "Meine Personen")
- [x] 14.3 Add statistics overview section (total events, total participants, upcoming events)
- [x] 14.4 Add search and filter bar for events on landing page
- [x] 14.5 Show event cards with color and icon from new Event fields
- [x] 14.6 Keep marketing landing page for unauthenticated users (EventsLandingPage)
- [x] 14.7 Add view mode toggle: list view vs calendar view (URL param ?view=list|calendar)

## 15. Frontend: Event Calendar View

- [x] 15.1 Create CalendarView component (CSS Grid month calendar, no external library) in `frontend/src/components/events/CalendarView.tsx`
- [x] 15.2 Show events as colored bars/dots using Event.color
- [x] 15.3 Add month navigation (previous/next), highlight today
- [x] 15.4 On mobile (<640px), show week view instead of month
- [x] 15.5 Click on event navigates to event dashboard

## 16. Frontend: Event Templates & Duplication

- [x] 16.1 Add "Als Vorlage speichern" toggle in SettingsTab
- [x] 16.2 Add "Duplizieren" button in SettingsTab and event card context menu, with optional date_shift_weeks input
- [x] 16.3 Add "Vorlagen" section on event landing page showing template events
- [x] 16.4 Implement duplicate mutation with redirect to new event dashboard

## 17. Frontend: Waitlist

- [x] 17.1 Show "Auf Warteliste setzen" button in OverviewTab when booking option is full
- [x] 17.2 Show waitlist status for current user in OverviewTab
- [x] 17.3 Add waitlist section to admin ParticipantsTab (list with remove action)

## 18. Frontend: Attendance Tracking

- [x] 18.1 Create AttendanceView component with toggle switches per participant in `frontend/src/components/events/dashboard/AttendanceView.tsx`
- [x] 18.2 Add attendance section to ParticipantsTab (visible during "running" phase or for managers)
- [x] 18.3 Add batch check-in functionality (select multiple → check all in)
- [x] 18.4 Show attendance summary (X of Y checked in)

## 19. Frontend: Personen-Verwaltung

- [x] 19.1 Create PersonsPage at route `/events/app/persons` in `frontend/src/pages/PersonsPage.tsx`
- [x] 19.2 CRUD list with search (debounced, URL-driven) and pagination
- [x] 19.3 Create/edit person dialog with all Person fields (scout_name, first_name, last_name, address, zip_code, city, email, birthday, gender, nutritional_tags)
- [x] 19.4 Delete with confirmation dialog
- [x] 19.5 Add route in `App.tsx`
- [x] 19.6 Add link from event landing page Quick-Actions

## 20. Frontend: Manual Phase Control

- [x] 20.1 Add manual phase dropdown to SettingsTab ("Automatisch" + all EventPhaseChoices)
- [x] 20.2 Show warning when manual phase differs from computed phase
- [x] 20.3 Update PhaseGuidanceBanner to show manual phase override info

## 21. Frontend: Participant Import

- [x] 21.1 Create ImportDialog component in `frontend/src/components/events/dashboard/ImportDialog.tsx`
- [x] 21.2 File upload step (CSV/Excel drag-and-drop)
- [x] 21.3 Column mapping step (auto-detect + manual mapping for first_name, last_name, email, scout_name, booking_option)
- [x] 21.4 Preview step showing parsed data with validation errors per row
- [x] 21.5 Result step showing import summary (success count, error list)
- [x] 21.6 Add "Teilnehmer importieren" button in ParticipantsTab (admin view)

## 22. Frontend: QR Code

- [x] 22.1 Create QRCodePage component with event name, date, location, QR code pointing to registration URL in `frontend/src/components/events/dashboard/QRCodeView.tsx`
- [x] 22.2 Add "QR-Code anzeigen" button in Einladung & Gäste tab
- [x] 22.3 Add "Als PNG herunterladen" button (1024x1024px)
- [x] 22.4 Printable layout with `@media print` styles

## 23. Frontend: Room/Tent Assignment

- [x] 23.1 Create RoomAssignmentView component with drag-and-drop using @dnd-kit in `frontend/src/components/events/dashboard/RoomAssignmentView.tsx`
- [x] 23.2 "Nicht eingeteilt" section for unassigned participants
- [x] 23.3 Room cards with capacity indicator (X/Y filled)
- [x] 23.4 Create/edit/delete room dialogs
- [x] 23.5 Add room assignment section to ParticipantsTab (admin view)
- [x] 23.6 Print-friendly room assignment list

## 24. Frontend: Meal Plan Link

- [x] 24.1 Add "Essensplan verknüpfen" button in SettingsTab or OverviewTab
- [x] 24.2 Select from existing MealEvents or create new one
- [x] 24.3 Show meal plan summary card in OverviewTab when linked
- [x] 24.4 Link to full meal plan page (`/planning/meal-plans/{id}`)

## 25. Frontend: Program Editor

- [x] 25.1 Create ProgramEditor component with day-by-day timeline view using @dnd-kit in `frontend/src/components/events/dashboard/ProgramEditor.tsx`
- [x] 25.2 Inline CRUD for EventDaySlots (title, start_time, end_time, notes)
- [x] 25.3 Content linking: search/autocomplete for GroupSession and Game via GenericForeignKey
- [x] 25.4 Drag-and-drop reordering (updates sort_order)
- [x] 25.5 Print-friendly program view with `@media print` styles
- [x] 25.6 Replace or enhance existing EventDayPlan component in dashboard

## 26. Frontend: Budget

- [x] 26.1 Create BudgetCard component for OverviewTab (income vs expense bar) in `frontend/src/components/events/dashboard/BudgetCard.tsx`
- [x] 26.2 Create BudgetDetailView in Aktivität tab or as section in OverviewTab
- [x] 26.3 CRUD for BudgetItems (description, amount, category, is_expense)
- [x] 26.4 Computed summary: total_income, expected_income, total_expenses, balance

## 27. Frontend: Parent Access

- [x] 27.1 Create ParentAccessView in Einladung & Gäste tab (manager: generate tokens, list, revoke) in `frontend/src/components/events/dashboard/ParentAccessView.tsx`
- [x] 27.2 Batch generation: "Für alle Teilnehmer generieren" button
- [x] 27.3 Create ParentPage at route `/events/:slug/parent/:token` in `frontend/src/pages/ParentPage.tsx`
- [x] 27.4 Parent view: child name, event dates, packing list, meeting point with map, event description
- [x] 27.5 Add route in `App.tsx` (public, no auth required)

## 28. Frontend: Event Colors & Icons in UI

- [x] 28.1 Update event card components to display event color as accent/border and icon
- [x] 28.2 Update event dashboard header to show event color and icon
- [x] 28.3 Update PhaseBadge and PhaseTimeline to use event color theming

## 29. Testing

- [x] 29.1 Backend: Write pytest tests for EventColorChoices, EventIconChoices, EventPhaseChoices validation
- [x] 29.2 Backend: Write pytest tests for new Event model fields (color, icon, is_template, manual_phase) and migration
- [x] 29.3 Backend: Write pytest tests for Event.compute_phase() with manual_phase override
- [x] 29.4 Backend: Write pytest tests for slug check endpoint
- [x] 29.5 Backend: Write pytest tests for event duplication endpoint and service (including date_shift_weeks)
- [x] 29.6 Backend: Write pytest tests for waitlist API endpoints and auto-notification service (person FK SET_NULL behavior)
- [x] 29.7 Backend: Write pytest tests for attendance API endpoints (including batch check-in)
- [x] 29.8 Backend: Write pytest tests for checklist endpoint
- [x] 29.9 Backend: Write pytest tests for coordinate fields on EventLocation and MeetingPoint
- [x] 29.10 Backend: Write pytest tests for room assignment API endpoints
- [x] 29.11 Backend: Write pytest tests for parent access token generation and expiration
- [x] 29.12 Backend: Write pytest tests for budget API endpoints
- [x] 29.13 Backend: Write pytest tests for participant import service (CSV/Excel parsing)
- [x] 29.14 Backend: Write pytest tests for event list excluding templates
- [x] 29.15 Backend: Write pytest tests for API route order (check-slug and templates before {slug})
- [x] 29.16 Frontend: Write Vitest tests for geocoding utility
- [x] 29.17 Frontend: Write Vitest tests for wizard store (Zustand) in `frontend/src/store/`
- [x] 29.18 Frontend: Write Vitest tests for smart defaults calculation (next weekend dates, "Mein Lager" naming)
- [x] 29.19 Frontend: Write Vitest tests for calendar view date calculations
