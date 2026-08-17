## Phase 0: Package-Umbau (Refactoring, keine neuen Features) — ~8h

### 0.1 Content App Package-Umbau (DRINGEND — 7.022 Zeilen)

- [x] 0.1.1 Create `backend/content/models/` package: `__init__.py`, `core.py` (SoftDeleteModel, Content abstract), `tags.py` (Tag, ScoutLevel, TagSuggestion), `interactions.py` (ContentComment, ContentEmotion, ContentView), `links.py` (ContentLink, EmbeddingFeedback), `approval.py` (ApprovalLog, FeaturedContent), `search.py` (SearchLog)
- [x] 0.1.2 Create `backend/content/schemas/` package: `__init__.py`, `base.py` (from base_schemas.py: TagOut, ContentListOut, ContentDetailOut, etc.), `search.py` (from api.py inline: UnifiedSearchFilterIn, etc.), `ai.py` (from api.py inline: AiImproveTextIn/Out, etc.), `approval.py` (from api.py inline: ApprovalQueueItemOut, etc.), `admin.py` (from api.py inline: EmbeddingStatusItemOut, etc.), `content_links.py` (from api.py inline: ContentLinkDetailOut, etc.), `tags.py` (from base_schemas.py: TagOut, TagTreeOut, etc.)
- [x] 0.1.3 Create `backend/content/api/` package: `__init__.py`, `search.py`, `ai.py`, `approval.py`, `admin.py`, `content_links.py`, `featured.py`, `tags.py`. Move `base_api.py` helper functions into appropriate modules or keep as `helpers.py`.
- [x] 0.1.4 Delete old `backend/content/models.py`, `backend/content/api.py`, `backend/content/base_schemas.py`, `backend/content/base_api.py`. Ensure `__init__.py` re-exports maintain all existing imports.
- [x] 0.1.5 Fix duplicate `ApprovalActionIn` schema (exists in both base_schemas.py and api.py inline)
- [x] 0.1.6 Run `uv run python manage.py check` and `uv run pytest backend/content/` — verify no import breakage

### 0.2 Event App Package-Umbau

- [x] 0.2.1 Create `backend/event/models/` package: `__init__.py`, `core.py` (EventLocation, Event, BookingOption, Person, Registration, Participant), `day_slots.py` (EventDaySlot)
- [x] 0.2.2 Create `backend/event/schemas/` package: `__init__.py`, `core.py` (all existing schemas), `day_slots.py` (EventDaySlot schemas)
- [x] 0.2.3 Create `backend/event/api/` package: `__init__.py`, `events.py` (Event CRUD + Einladungen + generate-invitation), `participants.py` (Teilnehmer-Verwaltung), `persons.py` (Person CRUD), `locations.py` (Location CRUD), `day_slots.py` (DaySlot CRUD)
- [x] 0.2.4 Delete old `backend/event/models.py`, `backend/event/api.py`, `backend/event/schemas.py`. Ensure re-exports.
- [x] 0.2.5 Run `uv run python manage.py check` and `uv run pytest backend/event/` — verify no import breakage

### 0.3 Supply App Package-Umbau

- [x] 0.3.1 Create `backend/supply/models/` package: `__init__.py`, `material.py` (Supply abstract, Material, ContentMaterialItem), `ingredient.py` (Ingredient, IngredientAlias, Portion, Price), `reference.py` (MeasuringUnit, NutritionalTag, RetailSection)
- [x] 0.3.2 Create `backend/supply/schemas/` package: `__init__.py`, `materials.py`, `ingredients.py`, `reference.py`
- [x] 0.3.3 Create `backend/supply/api/` package: `__init__.py`, `materials.py` (Material CRUD + Suche), `ingredients.py` (Ingredient CRUD + Portions + Prices + Aliases), `reference.py` (MeasuringUnits, NutritionalTags, RetailSections)
- [x] 0.3.4 Delete old files. Ensure re-exports.
- [x] 0.3.5 Run `uv run python manage.py check` and `uv run pytest backend/supply/` — verify no import breakage

### 0.4 Profiles App Package-Umbau

- [x] 0.4.1 Create `backend/profiles/models/` package: `__init__.py`, `profile.py` (UserProfile, UserPreference), `groups.py` (UserGroup, GroupMembership, GroupJoinRequest)
- [x] 0.4.2 Create `backend/profiles/schemas/` package: `__init__.py`, `profile.py`, `groups.py`
- [x] 0.4.3 Create `backend/profiles/api/` package: `__init__.py`, `profile.py`, `groups.py`
- [x] 0.4.4 Delete old files. Ensure re-exports.
- [x] 0.4.5 Run `uv run python manage.py check` and `uv run pytest backend/profiles/` — verify no import breakage

### 0.5 Recipe App Package-Umbau

- [x] 0.5.1 Create `backend/recipe/models/` package: `__init__.py`, `recipe.py` (Recipe), `items.py` (RecipeItem), `hints.py` (RecipeHint)
- [x] 0.5.2 Create `backend/recipe/schemas/` package: `__init__.py`, `recipes.py`, `items.py`, `nutrition.py`
- [x] 0.5.3 Create `backend/recipe/api/` package: `__init__.py`, `recipes.py` (CRUD + Image + Similar + Interactions), `items.py` (RecipeItem CRUD), `nutrition.py` (NutriScore, Breakdown, Checks, Hints)
- [x] 0.5.4 Delete old files. Ensure re-exports.
- [x] 0.5.5 Run `uv run python manage.py check` and `uv run pytest backend/recipe/` — verify no import breakage

### 0.6 Planner App Package-Umbau

- [x] 0.6.1 Create `backend/planner/models/` package: `__init__.py`, `planner.py` (Planner, PlannerEntry, PlannerCollaborator), `meal_plan.py` (MealPlan, MealDay, Meal, MealItem)
- [x] 0.6.2 Create `backend/planner/schemas/` package: `__init__.py`, `planner.py`, `meal_plan.py`
- [x] 0.6.3 Create `backend/planner/api/` package: `__init__.py`, `planner.py`, `meal_plan.py` (integrate existing meal_plan_api.py)
- [x] 0.6.4 Delete old files (models.py, schemas.py, api.py, meal_plan_api.py). Ensure re-exports.
- [x] 0.6.5 Run `uv run python manage.py check` and `uv run pytest backend/planner/` — verify no import breakage

### 0.7 Cross-Cutting

- [x] 0.7.1 Update `AGENTS.md` (root) with Package-Konvention and all decisions from this change
- [x] 0.7.2 Update `backend/AGENTS.md` with Package-Muster documentation and import conventions
- [x] 0.7.3 Run full test suite: `uv run pytest` — verify nothing is broken across all apps
- [x] 0.7.4 Verify `uv run python manage.py runserver` starts without errors

---

## Phase 1: Event Core Features (Timeline, Labels, Payments, Custom Fields, Dashboard Shell) — ~16h

### 1.1 Backend: New Models & Migrations

- [x] 1.1.1 Add `TimelineEntry` model to `backend/event/models/timeline.py` (event FK, participant FK nullable, user FK nullable, action_type choices, description, metadata JSONField, created_at)
- [x] 1.1.2 Add `TimelineActionChoices` to `backend/event/choices.py` (registered, unregistered, payment_received, payment_removed, booking_changed, label_added, label_removed, custom_field_updated, mail_sent, participant_updated)
- [x] 1.1.3 Add `Payment` model to `backend/event/models/payment.py` (participant FK, amount DecimalField, method choices, received_at, location, note, created_by FK, created_at)
- [x] 1.1.4 Add `PaymentMethodChoices` to `backend/event/choices.py` (bar, paypal, ueberweisung, sonstige)
- [x] 1.1.5 Add `CustomField` model to `backend/event/models/custom_fields.py` (event FK, label, field_type choices, options JSONField, is_required, sort_order, created_at)
- [x] 1.1.6 Add `CustomFieldValue` model to `backend/event/models/custom_fields.py` (custom_field FK, participant FK, value TextField)
- [x] 1.1.7 Add `ParticipantLabel` model to `backend/event/models/labels.py` (event FK, name, color, created_at)
- [x] 1.1.8 Add `labels` M2M field on `Participant` model (M2M to ParticipantLabel)
- [x] 1.1.9 Remove `is_paid` BooleanField from `Participant` model, add `is_paid` @property (sum of payments >= booking_option.price), add `total_paid` @property, add `remaining_amount` @property
- [x] 1.1.10 Update `models/__init__.py` to re-export all new models
- [x] 1.1.11 Run `uv run python manage.py makemigrations event` and verify migration
- [x] 1.1.12 Run `uv run python manage.py migrate` and verify all tables created

### 1.2 Backend: Services

- [x] 1.2.1 Create `backend/event/services/` directory with `__init__.py`
- [x] 1.2.2 Implement `backend/event/services/timeline.py` — `TimelineService.log(event, action_type, description, participant=None, user=None, metadata=None)`
- [x] 1.2.3 Implement `backend/event/services/payment.py` — `PaymentService.create_payment(participant, amount, method, ...)` creates Payment + logs timeline

### 1.3 Backend: Schemas

- [x] 1.3.1 Add `TimelineEntryOut` schema to `backend/event/schemas/timeline.py`
- [x] 1.3.2 Add `PaymentOut`, `PaymentCreateIn` schemas to `backend/event/schemas/payment.py`
- [x] 1.3.3 Add `CustomFieldOut`, `CustomFieldCreateIn`, `CustomFieldUpdateIn`, `CustomFieldValueOut`, `CustomFieldValuesIn` schemas to `backend/event/schemas/custom_fields.py`
- [x] 1.3.4 Add `LabelOut`, `LabelCreateIn`, `LabelUpdateIn`, `LabelAssignIn` schemas to `backend/event/schemas/labels.py`
- [x] 1.3.5 Update `ParticipantOut` schema to include `is_paid` (computed), `total_paid`, `remaining_amount`, `labels`, `custom_field_values`
- [x] 1.3.6 Add `ResponsiblePersonOut` schema and add `responsible_persons_detail` to `EventDetailOut`
- [x] 1.3.7 Fix missing `city` field in `ParticipantOut` schema (existing bug)

### 1.4 Backend: API Endpoints

- [x] 1.4.1 Add `GET /api/events/{slug}/timeline/` endpoint in `backend/event/api/timeline.py` (paginated, filterable by participant_id and action_type)
- [x] 1.4.2 Add `GET /api/events/{slug}/payments/` endpoint in `backend/event/api/payment.py` (paginated)
- [x] 1.4.3 Add `POST /api/events/{slug}/payments/` endpoint (create payment, log timeline)
- [x] 1.4.4 Add `DELETE /api/events/{slug}/payments/{id}/` endpoint (delete payment, log timeline)
- [x] 1.4.5 Add `GET /api/events/choices/payment-methods/` endpoint
- [x] 1.4.6 Add CRUD endpoints for custom fields in `backend/event/api/custom_fields.py`: `GET/POST /api/events/{slug}/custom-fields/`, `PATCH/DELETE /api/events/{slug}/custom-fields/{id}/`
- [x] 1.4.7 Add `PATCH /api/events/{slug}/participants/{id}/custom-fields/` endpoint (set custom field values)
- [x] 1.4.8 Add CRUD endpoints for labels in `backend/event/api/labels.py`: `GET/POST /api/events/{slug}/labels/`, `PATCH/DELETE /api/events/{slug}/labels/{id}/`
- [x] 1.4.9 Add label assignment endpoints: `POST /api/events/{slug}/participants/{id}/labels/`, `DELETE /api/events/{slug}/participants/{id}/labels/{label_id}/`
- [x] 1.4.10 Add participant list filters: `?is_paid=`, `?booking_option_id=`, `?label_id=`, `?search=`
- [x] 1.4.11 Add pagination to participant list endpoint
- [x] 1.4.12 Integrate timeline logging into existing registration and unregistration endpoints
- [x] 1.4.13 Integrate timeline logging into existing participant update endpoint
- [x] 1.4.14 Register new API routers in `api/__init__.py`

### 1.5 Backend: Admin & Tests

- [x] 1.5.1 Register new models in `backend/event/admin.py` (TimelineEntry, Payment, CustomField, CustomFieldValue, ParticipantLabel)
- [x] 1.5.2 Add test factories for new models
- [x] 1.5.3 Write tests for timeline API (list, filter, permission check)
- [x] 1.5.4 Write tests for payment API (create, list, delete, computed is_paid, permission check)
- [x] 1.5.5 Write tests for custom field API (CRUD, value setting, validation)
- [x] 1.5.6 Write tests for label API (CRUD, assign/remove, filter participants by label)
- [x] 1.5.7 Write tests for timeline integration (registration/payment creates entry)

### 1.6 Frontend: Zod Schemas & Hooks

- [x] 1.6.1 Add `TimelineEntrySchema` to `frontend/src/schemas/event.ts`
- [x] 1.6.2 Add `PaymentSchema`, `PaymentCreateSchema`
- [x] 1.6.3 Add `CustomFieldSchema`, `CustomFieldValueSchema`
- [x] 1.6.4 Add `LabelSchema`
- [x] 1.6.5 Update `ParticipantSchema` to include is_paid, total_paid, remaining_amount, labels, custom_field_values
- [x] 1.6.6 Update `EventDetailSchema` to include responsible_persons_detail
- [x] 1.6.7 Add `useEventTimeline(slug, filters)` hook
- [x] 1.6.8 Add `useEventPayments(slug)`, `useCreatePayment(slug)`, `useDeletePayment(slug)` hooks
- [x] 1.6.9 Add `useCustomFields(slug)`, `useCreateCustomField`, `useUpdateCustomField`, `useDeleteCustomField` hooks
- [x] 1.6.10 Add `useLabels(slug)`, `useCreateLabel`, `useUpdateLabel`, `useDeleteLabel`, `useAssignLabel`, `useRemoveLabel` hooks
- [x] 1.6.11 Add `usePaymentMethodChoices()` hook

### 1.7 Frontend: Dashboard Shell & Core Tabs

- [x] 1.7.1 Create `frontend/src/pages/EventDetailPage.tsx` with tab navigation (Übersicht, Teilnehmer, Zahlungen, Timeline, E-Mails, Exporte, Einstellungen)
- [x] 1.7.2 Add route `/events/app/:slug` in `App.tsx`
- [x] 1.7.3 Implement URL-driven tab state via `?tab=` query parameter
- [x] 1.7.4 Update `EventsPage.tsx` to navigate to `/events/app/:slug` on event click
- [x] 1.7.5 Create `OverviewTab.tsx` with KPI cards (Teilnehmer, Bezahlt, Einnahmen), Kontaktperson, Quick Actions, recent timeline
- [x] 1.7.6 Create `ParticipantsTab.tsx` with filterable list, label badges, payment status icons, custom field values
- [x] 1.7.7 Create `PaymentsTab.tsx` with payment list, summary cards, "Zahlung erfassen" form
- [x] 1.7.8 Create `TimelineTab.tsx` with chronological list, action-type icons, filters, pagination
- [x] 1.7.9 Create `SettingsTab.tsx` with custom field management, label management, event editing, danger zone
- [x] 1.7.10 Implement simplified non-manager view (hide management tabs for invited users)

---

## Phase 2: Export & Statistiken — ~10h

### 2.1 Backend: Export

- [x] 2.1.1 Add `openpyxl` dependency to `pyproject.toml`
- [x] 2.1.2 Add `reportlab` dependency to `pyproject.toml`
- [x] 2.1.3 Implement `backend/event/services/export.py` — `ExportService.export_participants(event, columns, format, filters)` generates Excel/CSV/PDF
- [x] 2.1.4 Add `ExportConfigIn`, `ExportColumnOut` schemas to `backend/event/schemas/export.py`
- [x] 2.1.5 Add `POST /api/events/{slug}/export/` endpoint (returns file download)
- [x] 2.1.6 Add `GET /api/events/{slug}/export/columns/` endpoint (available columns incl. custom fields and labels)
- [x] 2.1.7 Write tests for export API (Excel/CSV/PDF generation, column selection, filters)

### 2.2 Backend: Statistics

- [x] 2.2.1 Implement `backend/event/services/stats.py` — `StatsService.get_stats(event)` computes capacity, payment, demographic, nutrition, timeline stats
- [x] 2.2.2 Add `StatsOut` schema (with nested capacity, payment, demographics sub-schemas) to `backend/event/schemas/stats.py`
- [x] 2.2.3 Add `GET /api/events/{slug}/stats/` endpoint
- [x] 2.2.4 Write tests for stats API

### 2.3 Frontend: Export & Stats

- [x] 2.3.1 Add `ExportConfigSchema`, `ExportColumnSchema` to Zod schemas
- [x] 2.3.2 Add `StatsSchema` to Zod schemas
- [x] 2.3.3 Add `useExportColumns(slug)`, `useExportParticipants(slug)` hooks
- [x] 2.3.4 Add `useEventStats(slug)` hook
- [x] 2.3.5 Create `ExportTab.tsx` with column selection, format selector, filter dropdowns, download trigger
- [x] 2.3.6 Create `StatsView.tsx` component (can be embedded in OverviewTab or as separate section)
- [x] 2.3.7 Add mini registration chart to OverviewTab

---

## Phase 3: Rundmail & Landing Page — ~8h

### 3.1 Backend: Mail

- [x] 3.1.1 Implement `backend/event/services/mail.py` — `MailService.send_mail(event, subject, body, recipient_type, filters, participant_ids)` with placeholder replacement
- [x] 3.1.2 Add `MailCreateIn`, `MailResultOut` schemas to `backend/event/schemas/mail.py`
- [x] 3.1.3 Add `POST /api/events/{slug}/send-mail/` endpoint (send mails, log timeline)
- [x] 3.1.4 Write tests for mail API (send to all/filtered/selected, placeholder replacement, result reporting)

### 3.2 Frontend: Mail Tab

- [x] 3.2.1 Add `MailCreateSchema`, `MailResultSchema` to Zod schemas
- [x] 3.2.2 Add `useSendMail(slug)` hook
- [x] 3.2.3 Create `MailTab.tsx` with recipient type selector, placeholder toolbar, mail preview, send confirmation

### 3.3 Frontend: Landing Page Enhancement

- [x] 3.3.1 Update `EventsLandingPage.tsx` hero section with improved copy and CTA
- [x] 3.3.2 Add feature sections for all new capabilities (Timeline, Payments, Stats, Mails, Export, Custom Fields, Labels)
- [x] 3.3.3 Add step-by-step walkthrough section (Event erstellen → Einladen → Verwalten → Tracken → Kommunizieren → Auswerten)
- [x] 3.3.4 Enhance interactive sandbox with demo data for new features
- [x] 3.3.5 Ensure mobile responsiveness for all new sections

---

## Phase 4: Polish & Integration — ~6h

### 4.1 Registration Flow Integration

- [x] 4.1.1 Add custom fields to registration flow (RegisterForm shows custom fields defined for the event)
- [x] 4.1.2 Add `booking_changed` timeline entry when participant's booking option is changed

### 4.2 Pagination & Bug Fixes

- [x] 4.2.1 Add pagination to existing event list endpoint (if not already paginated)
- [x] 4.2.2 Add pagination to existing person list endpoint
- [x] 4.2.3 Add pagination to existing location list endpoint
- [x] 4.2.4 Verify all new endpoints use pagination (timeline, payments, participants)

### 4.3 Seed Data & Testing

- [x] 4.3.1 Add seed data for new models in `core/management/commands/seed_all.py` (sample timeline entries, payments, custom fields, labels)
- [x] 4.3.2 Run full test suite: `uv run pytest backend/event/` and fix any failures
- [x] 4.3.3 Run full test suite: `uv run pytest` across all apps (verify package restructuring didn't break anything)

### 4.4 Mobile & UX Polish

- [x] 4.4.1 Ensure mobile-responsive layout for all dashboard tabs (card layout on mobile, table on desktop)
- [x] 4.4.2 Verify Pydantic ↔ Zod schema sync for all new schemas
- [x] 4.4.3 Update `frontend/AGENTS.md` if new frontend patterns were established
- [x] 4.4.4 Update `backend/event/AGENTS.md` with new models, endpoints and package structure
