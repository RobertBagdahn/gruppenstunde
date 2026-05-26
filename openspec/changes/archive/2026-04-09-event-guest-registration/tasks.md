## 1. Backend: BookingOption Ablaufdatum

- [x] 1.1 Add `bookable_from` (DateTimeField, null=True, blank=True) and `bookable_till` (DateTimeField, null=True, blank=True) fields to `BookingOption` model in `backend/event/models/core.py`
- [x] 1.2 Add computed property `is_bookable` on `BookingOption` that checks current time against `bookable_from`/`bookable_till` (null = no restriction)
- [x] 1.3 Run `uv run python manage.py makemigrations event` and verify migration
- [x] 1.4 Update Pydantic schemas in `backend/event/schemas/core.py`: Add `bookable_from`, `bookable_till`, `is_bookable` to `BookingOptionOut`; add `bookable_from`, `bookable_till` to `BookingOptionCreateIn` and `BookingOptionUpdateIn`
- [x] 1.5 Update `register_for_event` in `backend/event/api/events.py` to check `is_bookable` for non-admin registrations (return HTTP 400 if not bookable)
- [x] 1.6 Ensure admin registration (`register-admin`) and participant update bypass `is_bookable` check

## 2. Backend: Registration Soft-Delete

- [x] 2.1 Add `deleted_at` (DateTimeField, null=True), `deleted_by` (FK User, null=True), `deleted_reason` (CharField with choices: duplicate/error/cancel/other, blank=True) to `Registration` model
- [x] 2.2 Add `RegistrationDeletionReason` choices to `backend/event/choices.py`
- [x] 2.3 Create `ActiveRegistrationManager` as default manager on Registration that filters `deleted_at__isnull=True`; keep `objects_all = models.Manager()` for unfiltered access
- [x] 2.4 Run `uv run python manage.py makemigrations event` and verify migration
- [x] 2.5 Update `remove_participant` in `backend/event/api/participants.py` to soft-delete (set `deleted_at`, `deleted_by`, `deleted_reason`) instead of hard-delete
- [x] 2.6 Accept optional `reason` in DELETE request body for participant removal
- [x] 2.7 Verify that all existing queries (stats, exports, participant lists) automatically exclude soft-deleted registrations via default manager

## 3. Backend: Event Guest Registration Toggle

- [x] 3.1 Add `guest_registration_enabled` (BooleanField, default=False) to `Event` model in `backend/event/models/core.py`
- [x] 3.2 Run `uv run python manage.py makemigrations event` and verify migration
- [x] 3.3 Add `guest_registration_enabled` to `EventUpdateIn` Pydantic schema
- [x] 3.4 Add `guest_registration_url` (optional string) to `EventDetailOut` schema, computed only for managers when `guest_registration_enabled=True`
- [x] 3.5 Update `get_event` API to populate `guest_registration_url` for managers

## 4. Backend: Guest Registration Service

- [x] 4.1 Create `backend/event/services/guest_registration.py` with `GuestRegistrationService`
- [x] 4.2 Implement `create_or_get_user(email: str) -> User` — creates User with unusable password if not exists, case-insensitive email lookup
- [x] 4.3 Implement `create_guest_registration(event, persons_data, email) -> Registration` — creates User, Persons, Registration, Participants in a transaction
- [x] 4.4 Add validation: check event phase is `registration`, `guest_registration_enabled=True`, booking options are bookable and not system/full

## 5. Backend: Guest Registration API

- [x] 5.1 Create `GuestRegistrationPersonIn` Pydantic schema (first_name, last_name, scout_name?, birthday?, gender?, booking_option_id)
- [x] 5.2 Create `GuestRegistrationIn` Pydantic schema (persons: list[GuestRegistrationPersonIn], email: EmailStr)
- [x] 5.3 Create `GuestRegistrationOut` Pydantic schema (registration_id, participant_count, email)
- [x] 5.4 Add `POST /api/events/{slug}/register-guest/` endpoint in `backend/event/api/events.py` — no auth required, calls `GuestRegistrationService`
- [x] 5.5 Add rate limiting to guest registration endpoint (e.g., 10 requests per IP per hour)

## 6. Backend: Admin Registration Enhancement

- [x] 6.1 Create `InlinePersonDataIn` Pydantic schema (first_name, last_name, scout_name?, email?, birthday?, gender?)
- [x] 6.2 Update `AdminRegisterPersonIn` schema to accept either `person_id` OR `person_data: InlinePersonDataIn` (union type)
- [x] 6.3 Update `register_admin` endpoint to handle inline person creation: create Person + User (if email provided), then create Participant
- [x] 6.4 Ensure admin registration bypasses `is_bookable` checks (already bypasses capacity, now also time window)

## 7. Backend: Confirmation Emails

- [x] 7.1 Add `send_registration_confirmation(event, registration, participants)` method to `MailService` in `backend/event/services/mail.py`
- [x] 7.2 Create HTML email template with event name, registered persons, booking options, dates, location
- [x] 7.3 Call `send_registration_confirmation()` after successful registration in `register_for_event`, `register_admin`, and `register_guest` endpoints
- [x] 7.4 Skip email if no email address is available for the registrant

## 8. Backend: Schema Sync & Migrations

- [x] 8.1 Run all pending migrations: `uv run python manage.py migrate`
- [x] 8.2 Verify all Pydantic schemas are consistent (BookingOptionOut, EventDetailOut, AdminRegisterPersonIn, GuestRegistration schemas)
- [x] 8.3 Update Django admin (`backend/event/admin.py`) to show new fields (guest_registration_enabled, bookable_from, bookable_till, deleted_at)

## 9. Frontend: Zod Schema Sync

- [x] 9.1 Update `BookingOptionSchema` in `frontend/src/schemas/event.ts` — add `bookable_from` (string | null), `bookable_till` (string | null), `is_bookable` (boolean)
- [x] 9.2 Update `EventDetailSchema` — add `guest_registration_enabled` (boolean), `guest_registration_url` (string, optional)
- [x] 9.3 Add `GuestRegistrationPersonSchema` Zod schema (first_name, last_name, scout_name?, birthday?, gender?, booking_option_id)
- [x] 9.4 Add `GuestRegistrationSchema` Zod schema (persons, email)
- [x] 9.5 Add `GuestRegistrationResponseSchema` Zod schema (registration_id, participant_count, email)

## 10. Frontend: Smart Defaults in Event Creation

- [x] 10.1 In `NewEventPage.tsx` Step 0: Add useEffect that sets end date to next Sunday when start date changes (only if not manually edited)
- [x] 10.2 In `NewEventPage.tsx` Step 0: Add useEffect that sets registration deadline to previous Sunday 23:59 when start date changes (only if not manually edited)
- [x] 10.3 Track `endDateManuallyEdited` and `deadlineManuallyEdited` flags in component state
- [x] 10.4 In `NewEventPage.tsx` Step 2 (Booking Options): Auto-generate default "Standard" booking option with price = days x 10 EUR when start+end date set and no custom options added
- [x] 10.5 Track `bookingOptionsManuallyEdited` flag to prevent overwriting user input

## 11. Frontend: Booking Option Time Window UI

- [x] 11.1 Update booking option creation/edit form in event dashboard SettingsTab to include `bookable_from` and `bookable_till` date pickers
- [x] 11.2 In RegistrationTab: Filter booking option dropdown to only show options where `is_bookable === true` (for regular users)
- [x] 11.3 In admin registration (ParticipantsTab): Show all booking options, mark expired ones with "(abgelaufen)" suffix
- [x] 11.4 In NewEventPage Step 2: Add optional bookable_from/bookable_till fields to booking option form

## 12. Frontend: Guest Registration Page

- [x] 12.1 Create new route `/events/:slug/register` in React Router (public, no auth required)
- [x] 12.2 Create `GuestRegistrationPage.tsx` page component with event info header (name, dates, location)
- [x] 12.3 Implement person form fields (first_name, last_name, scout_name, birthday, gender) with "Weitere Person hinzufuegen" button
- [x] 12.4 Implement booking option dropdown per person (only bookable, non-system options)
- [x] 12.5 Add email input field at the bottom of the form (required)
- [x] 12.6 Create `useGuestRegistration` TanStack Query mutation hook
- [x] 12.7 Implement success state: replace form with success message "Anmeldung erfolgreich! Eine Bestaetigung wurde an {email} gesendet."
- [x] 12.8 Handle disabled/unavailable states: guest registration disabled, wrong event phase, event not found
- [x] 12.9 Mobile-first responsive layout (320px minimum)

## 13. Frontend: Organizer Guest Registration Management

- [x] 13.1 Add "Gastregistrierung" toggle to SettingsTab with guest_registration_enabled field
- [x] 13.2 Show copyable registration link when guest registration is enabled
- [x] 13.3 Add guest registration status hint card to OverviewTab (when enabled)
- [x] 13.4 Update `useUpdateEvent` hook to handle `guest_registration_enabled` field

## 14. Frontend: Admin Registration Enhancement

- [x] 14.1 Update admin registration dialog in ParticipantsTab: Add toggle "Neue Person anlegen" vs. "Bestehende Person waehlen"
- [x] 14.2 Implement inline person form (first_name, last_name, email, scout_name, birthday, gender) for "Neue Person" mode
- [x] 14.3 Update `useAdminRegister` hook to send either `person_id` or `person_data`
- [x] 14.4 Show all booking options (incl. system + expired) in admin registration with visual indicators

## 15. Frontend: Soft-Delete UI

- [x] 15.1 Update unregister confirmation dialog to include reason selection (Stornierung, Fehler, Duplikat, Sonstiges)
- [x] 15.2 Update `useRemoveParticipant` hook to send `reason` in request body

## 16. Tests

- [x] 16.1 Backend: Test BookingOption `is_bookable` property with various time windows
- [x] 16.2 Backend: Test guest registration endpoint (happy path, disabled, wrong phase, expired option, full option, system option)
- [x] 16.3 Backend: Test admin registration with inline person data
- [x] 16.4 Backend: Test soft-delete registration (deleted_at set, hidden from queries, timeline entry created)
- [x] 16.5 Backend: Test booking option time window enforcement on self-registration vs. admin bypass
- [x] 16.6 Backend: Test auto-account creation with existing vs. new email
