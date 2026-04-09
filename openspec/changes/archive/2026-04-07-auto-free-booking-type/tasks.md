## 1. Backend Model & Migration

- [x] 1.1 Add `is_system` BooleanField to `BookingOption` model in `backend/event/models/core.py` with `default=False`
- [x] 1.2 Add `UniqueConstraint` on `(event, is_system)` with `condition=Q(is_system=True)` to ensure max one system option per event
- [x] 1.3 Create schema migration: `uv run python manage.py makemigrations event`
- [x] 1.4 Create data migration to add system BookingOption ("Kostenlos (Organisator)", price=0, is_system=True) for all existing events
- [x] 1.5 Add `post_save` signal on `Event` to auto-create system BookingOption on event creation

## 2. Backend Pydantic Schemas

- [x] 2.1 Add `is_system: bool` field to `BookingOptionOut` in `backend/event/schemas/core.py`
- [x] 2.2 Verify `BookingOptionCreateIn` and `BookingOptionUpdateIn` do NOT expose `is_system` field

## 3. Backend API — BookingOption CRUD Protection

- [x] 3.1 Update `PATCH /{slug}/booking-options/{id}/` to return HTTP 403 for system BookingOptions in `backend/event/api/events.py`
- [x] 3.2 Update `DELETE /{slug}/booking-options/{id}/` to return HTTP 403 for system BookingOptions in `backend/event/api/events.py`

## 4. Backend API — Visibility Filtering

- [x] 4.1 Filter `is_system=True` BookingOptions from event detail response for non-manager users in `backend/event/api/events.py`
- [x] 4.2 Filter `is_system=True` BookingOptions from event list response for non-manager users

## 5. Backend API — Registration & Participant Update

- [x] 5.1 Update `POST /{slug}/register/` to reject `booking_option_id` pointing to system BookingOption (HTTP 400) in `backend/event/api/participants.py`
- [x] 5.2 Update `POST /{slug}/admin-register/` to allow system BookingOption and bypass `is_full` check
- [x] 5.3 Update `PATCH /{slug}/participants/{id}/` to allow managers to assign system BookingOption and bypass `is_full` check

## 6. Frontend Zod Schema Sync

- [x] 6.1 Add `is_system: z.boolean()` to `BookingOptionSchema` in `frontend/src/schemas/event.ts`

## 7. Frontend — Registration Form

- [x] 7.1 Filter out system BookingOptions from the booking option dropdown in `RegisterForm` in `frontend/src/pages/EventsPage.tsx` for regular users
- [x] 7.2 Show system BookingOptions in admin registration / participant edit for managers

## 8. Frontend — Dashboard Settings

- [x] 8.1 Display system BookingOption with "System" badge / lock icon in `BookingOptionsSection` in `frontend/src/components/events/dashboard/SettingsTab.tsx`
- [x] 8.2 Hide edit and delete buttons for system BookingOptions in `BookingOptionsSection`

## 9. Testing & Verification

- [x] 9.1 Run schema migration and data migration: `uv run python manage.py migrate`
- [x] 9.2 Verify system BookingOption is created for new events (manual test or pytest)
- [x] 9.3 Verify API filtering works correctly for managers vs. regular users
- [x] 9.4 Verify frontend hides system option for regular registration and shows it for admin actions
