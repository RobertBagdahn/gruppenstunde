## 1. Backend — Schema & API

- [x] 1.1 Add `invited_group_ids: list[int] = []` to `EventCreateIn` Pydantic schema in `backend/event/schemas/core.py`
- [x] 1.2 Update `create_event` API in `backend/event/api/events.py` to process `invited_group_ids` — filter valid groups the user is a member of, add to `event.invited_groups`
- [x] 1.3 Remove unused `group_id` field from `EventCreateIn` if present (replaced by `invited_group_ids`)

## 2. Frontend — Schema & Store

- [x] 2.1 Replace `group_id: z.number().nullable().optional()` with `invited_group_ids: z.array(z.number()).optional()` in `WizardStep2Schema` in `frontend/src/schemas/eventWizard.ts`
- [x] 2.2 Update `defaultData` in `frontend/src/store/eventWizardStore.ts` — replace `group_id: null` with `invited_group_ids: []`
- [x] 2.3 Update `getCreatePayload()` in store — send `invited_group_ids` instead of `group_id`
- [x] 2.4 Update `updateStep2` type to match new schema

## 3. Frontend — Group Selection UI

- [x] 3.1 Add `useMyGroups()` import to `StepGroupInvitation.tsx`
- [x] 3.2 Add "Gruppen einladen" section before person list with checkbox list of user's groups (only shown if user has groups)
- [x] 3.3 Implement `toggleGroup()` and bulk group selection logic
- [x] 3.4 Show selected group count in section header

## 4. Frontend — Summary Step

- [x] 4.1 Update `StepSummary.tsx` to display invited groups section (fetch group names via `useMyGroups` and filter by `invited_group_ids`)

## 5. Verification

- [x] 5.1 Verify TypeScript compilation passes (`npx tsc --noEmit`)
- [x] 5.2 Verify backend schema validation works (create event with and without `invited_group_ids`)
