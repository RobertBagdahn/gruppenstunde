## 1. Backend — Model & Migration

- [x] 1.1 Add `last_health_check_at` field to `WhatsAppConnection` model in `backend/event/models/whatsapp.py`
- [x] 1.2 Create `WhatsAppConnectionLog` model in `backend/event/models/whatsapp.py` with fields: connection FK, event_type, message, created_at
- [x] 1.3 Make `WhatsAppMessage.event` FK nullable (to support test messages without an event)
- [x] 1.4 Re-export new model in `backend/event/models/__init__.py`
- [x] 1.5 Run `uv run python manage.py makemigrations event` and verify migration file
- [x] 1.6 Run `uv run python manage.py migrate` and verify schema

## 2. Backend — Pydantic Schemas

- [x] 2.1 Add `WhatsAppHealthCheckOut` schema to `backend/event/schemas/whatsapp.py`
- [x] 2.2 Add `WhatsAppTestResultOut` schema to `backend/event/schemas/whatsapp.py`
- [x] 2.3 Add `WhatsAppReconnectOut` schema to `backend/event/schemas/whatsapp.py`
- [x] 2.4 Add `WhatsAppConnectionLogOut` schema to `backend/event/schemas/whatsapp.py`

## 3. Backend — Service Layer

- [x] 3.1 Add `_log_event()` helper to `WhatsAppService` for creating `WhatsAppConnectionLog` entries with auto-cleanup (max 50 per user)
- [x] 3.2 Implement `health_check(user)` method on `WhatsAppService`: check neonize client status, attempt reconnect from session, update `is_active` and `last_health_check_at`, log event
- [x] 3.3 Implement `send_test_message(user)` method on `WhatsAppService`: send predefined message to own number, enforce 1/min rate limit, log event
- [x] 3.4 Implement `reconnect(user)` method on `WhatsAppService`: attempt session reconnect, poll for status (max 10s), return needs_qr flag, log event
- [x] 3.5 Implement `get_connection_logs(user)` method on `WhatsAppService`: return last 10 log entries
- [x] 3.6 Add logging calls to existing `connect()`, `disconnect()`, `delete_data()` methods to log connection events
- [x] 3.7 Update `delete_data()` in `WhatsAppService` to also delete `WhatsAppConnectionLog` entries
- [x] 3.8 Update GDPR `WhatsAppPrivacyCollector` in `backend/event/services/privacy.py` to include connection logs in collect + anonymize

## 4. Backend — API Endpoints

- [x] 4.1 Add `POST /api/whatsapp/health-check/` endpoint in `backend/event/api/whatsapp.py`
- [x] 4.2 Add `POST /api/whatsapp/test/` endpoint in `backend/event/api/whatsapp.py`
- [x] 4.3 Add `POST /api/whatsapp/reconnect/` endpoint in `backend/event/api/whatsapp.py`
- [x] 4.4 Add `GET /api/whatsapp/logs/` endpoint in `backend/event/api/whatsapp.py`
- [x] 4.5 Import new schemas in API module

## 5. Frontend — Zod Schemas

- [x] 5.1 Add `WhatsAppHealthCheckSchema` to `frontend/src/schemas/whatsapp.ts`
- [x] 5.2 Add `WhatsAppTestResultSchema` to `frontend/src/schemas/whatsapp.ts`
- [x] 5.3 Add `WhatsAppReconnectSchema` to `frontend/src/schemas/whatsapp.ts`
- [x] 5.4 Add `WhatsAppConnectionLogSchema` to `frontend/src/schemas/whatsapp.ts`

## 6. Frontend — TanStack Query Hooks

- [x] 6.1 Add `useWhatsAppHealthCheck` mutation hook in `frontend/src/api/whatsapp.ts`
- [x] 6.2 Add `useWhatsAppTest` mutation hook in `frontend/src/api/whatsapp.ts`
- [x] 6.3 Add `useWhatsAppReconnect` mutation hook in `frontend/src/api/whatsapp.ts`
- [x] 6.4 Add `useWhatsAppLogs` query hook in `frontend/src/api/whatsapp.ts`
- [x] 6.5 Add `logs` key to `whatsappKeys` factory

## 7. Frontend — UI Components

- [x] 7.1 Create `WhatsAppConnectionLog` component to display last 5 log entries (collapsible) in `frontend/src/components/whatsapp/WhatsAppConnectionLog.tsx`
- [x] 7.2 Update `WhatsAppConnectionCard` connected state: add "Verbindung pruefen" button (health check), "Test senden" button, last health check timestamp display
- [x] 7.3 Update `WhatsAppConnectionCard` not-connected state: add "Erneut verbinden" button (reconnect) that opens QR dialog on `needs_qr: true`
- [x] 7.4 Integrate `WhatsAppConnectionLog` component into `WhatsAppConnectionCard`
- [x] 7.5 Mobile-responsive layout: ensure buttons stack on small screens (flex-wrap, gap-2)

## 8. Backend — Tests

- [x] 8.1 Add unit tests for `WhatsAppConnectionLog` model (creation, auto-cleanup)
- [x] 8.2 Add unit tests for health check service method
- [x] 8.3 Add unit tests for test message service method (success, rate limit, no connection)
- [x] 8.4 Add unit tests for reconnect service method
- [x] 8.5 Add API endpoint tests for all 4 new endpoints

## 9. Schema Sync Verification

- [x] 9.1 Verify Pydantic schemas match Zod schemas field-by-field
- [x] 9.2 Run frontend type check (`npx tsc --noEmit`) to verify no type errors
- [x] 9.3 Run backend type check and linting (`uv run ruff check backend/event/`)
