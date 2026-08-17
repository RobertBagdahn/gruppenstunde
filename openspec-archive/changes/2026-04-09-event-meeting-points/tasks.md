## 1. Backend Model & Migration

- [x] 1.1 Create `MeetingPoint` model in `backend/event/models/core.py` with fields: name, street, zip_code, city, description, created_by (FK User), group (FK UserGroup, nullable), created_at, updated_at, full_address property
- [x] 1.2 Add `meeting_point` FK (nullable, SET_NULL) and `pickup_point` FK (nullable, SET_NULL) to `Event` model in `backend/event/models/core.py`
- [x] 1.3 Export `MeetingPoint` from `backend/event/models/__init__.py`
- [x] 1.4 Run `uv run python manage.py makemigrations event` and verify migration
- [x] 1.5 Run `uv run python manage.py migrate` and verify success

## 2. Backend Pydantic Schemas

- [x] 2.1 Create `MeetingPointOut`, `MeetingPointCreateIn`, `MeetingPointUpdateIn`, `PaginatedMeetingPointOut` schemas in `backend/event/schemas/core.py`
- [x] 2.2 Add `meeting_point: MeetingPointOut | None` and `pickup_point: MeetingPointOut | None` to `EventDetailOut` and `EventListOut`
- [x] 2.3 Add `meeting_point_id: int | None = None` and `pickup_point_id: int | None = None` to `EventCreateIn` and `EventUpdateIn`

## 3. Backend MeetingPoint API

- [x] 3.1 Create `backend/event/api/meeting_points.py` with `meeting_point_router`
- [x] 3.2 Implement `GET /api/meeting-points/` — list visible MeetingPoints (own + group), paginated, with group membership Q-filter
- [x] 3.3 Implement `POST /api/meeting-points/` — create MeetingPoint, validate group membership if group_id provided
- [x] 3.4 Implement `GET /api/meeting-points/{id}/` — get single MeetingPoint, visibility check
- [x] 3.5 Implement `PATCH /api/meeting-points/{id}/` — update MeetingPoint, ownership/membership check
- [x] 3.6 Implement `DELETE /api/meeting-points/{id}/` — delete MeetingPoint, ownership check
- [x] 3.7 Register `meeting_point_router` in `backend/event/api/__init__.py` and mount in `backend/inspi/urls.py` at `/api/meeting-points/`

## 4. Backend Event API Updates

- [x] 4.1 Update `create_event` endpoint in `backend/event/api/events.py` to handle `meeting_point_id` and `pickup_point_id`
- [x] 4.2 Update `update_event` endpoint in `backend/event/api/events.py` to handle `meeting_point_id` and `pickup_point_id`
- [x] 4.3 Verify Event detail/list responses include resolved `meeting_point` and `pickup_point` data via schema

## 5. Frontend Zod Schemas

- [x] 5.1 Add `MeetingPointSchema` Zod schema in `frontend/src/schemas/event.ts` matching `MeetingPointOut`
- [x] 5.2 Add `meeting_point` and `pickup_point` fields to `EventDetailSchema` and `EventListSchema`
- [x] 5.3 Add `meeting_point_id` and `pickup_point_id` to event create/update types

## 6. Frontend API Hooks

- [x] 6.1 Add `useMeetingPoints()` TanStack Query hook in `frontend/src/api/events.ts` (GET `/api/meeting-points/`)
- [x] 6.2 Add `useCreateMeetingPoint()` mutation hook
- [x] 6.3 Add `useUpdateMeetingPoint()` and `useDeleteMeetingPoint()` mutation hooks

## 7. Frontend UI — MeetingPoint Picker Component

- [x] 7.1 Create `MeetingPointPicker` component with dropdown listing visible MeetingPoints + "Neuen Treffpunkt anlegen" option
- [x] 7.2 Add inline creation form in picker (name, street, zip_code, city fields)
- [x] 7.3 Add optional group_id selector for group MeetingPoints

## 8. Frontend UI — Event Forms

- [x] 8.1 Integrate `MeetingPointPicker` for "Treffpunkt" and "Abholpunkt" in `NewEventPage.tsx`
- [x] 8.2 Integrate `MeetingPointPicker` for "Treffpunkt" and "Abholpunkt" in `SettingsTab.tsx`
- [x] 8.3 Submit `meeting_point_id` and `pickup_point_id` with event create/update requests

## 9. Frontend UI — Event Detail Display

- [x] 9.1 Display Treffpunkt and Abholpunkt in event detail view (member view) with name and full_address
- [x] 9.2 Display Treffpunkt and Abholpunkt on `GuestRegistrationPage.tsx`

## 10. Testing & Verification

- [x] 10.1 Verify backend: MeetingPoint CRUD with visibility filtering works correctly
- [x] 10.2 Verify backend: Event create/update with meeting_point_id and pickup_point_id
- [x] 10.3 Verify frontend: MeetingPoint picker renders, creates, and selects correctly
- [x] 10.4 Verify frontend: Event detail displays Treffpunkt/Abholpunkt data
