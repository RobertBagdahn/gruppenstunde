## 1. Backend Override and Validation

- [x] 1.1 Update `MealPlanUpdateIn` to reject `norm_portions_manual: null` and validate positive whole-number manual values consistently.
- [x] 1.2 Preserve the current value in `previous_norm_portions` when enabling manual mode and restore the correct fallback when disabling manual mode without GroupMembers.
- [x] 1.3 Ensure standalone plans keep their direct `norm_portions` when `activity_factor` changes; only automatic/group-based plans recalculate.
- [x] 1.4 Validate nullable `start_datetime`/`end_datetime` before timezone conversion and return structured German errors for invalid ranges or unsupported null combinations.

## 2. Event Participant Synchronization

- [x] 2.1 Make `sync_event_participants` replace all previously event-synchronized members before creating the current participant snapshot.
- [x] 2.2 Preserve manually managed GroupMembers during event synchronization and keep `person_id`, age, gender, and nutritional tags synchronized.
- [x] 2.3 Add integration tests for repeated syncs, removed participants, preserved manual members, and manual norm portions.

## 3. Food Frontend Date and Settings Behavior

- [x] 3.1 Add timezone-safe conversion helpers for API ISO datetimes and `datetime-local` values using the Europe/Berlin display timezone.
- [x] 3.2 Prevent saving an invalid date range and show German validation feedback in `SettingsPanel`.
- [x] 3.3 Ensure standalone settings payloads preserve direct norm portions when PAL or unrelated settings are saved.
- [x] 3.4 Add component tests for date round-trips, invalid ranges, standalone PAL saves, and manual override reset without members.

## 4. Query Invalidation

- [x] 4.1 Centralize MealPlan query invalidation for detail, nutrition, shopping list, cost summary, cooking schedule, suggestions, and intelligent suggestions.
- [x] 4.2 Apply the invalidation helper to MealPlan settings mutations and all GroupMember mutations.
- [x] 4.3 Add a frontend mutation test that mocks `fetch`, executes the real `useUpdateMealPlan` path, verifies one response-body read, and verifies affected query invalidation.

## 5. Verification

- [x] 5.1 Run backend tests with `uv run pytest` and migration check with `uv run python manage.py makemigrations --check`.
- [x] 5.2 Run Food-Frontend tests, TypeScript build, and lint.
- [x] 5.3 Validate Pydantic/Zod contracts and run `openspec validate "harden-manual-norm-portions-override" --type change --strict`.
- [x] 5.4 Review the final diff and update the OpenSpec task status.
