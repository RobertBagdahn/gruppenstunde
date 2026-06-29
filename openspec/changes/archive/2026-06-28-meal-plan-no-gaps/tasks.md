## 1. Backend — Validierungs- und Merge-Funktionen

- [x] 1.1 Create `validate_meal_plan_contiguity()` utility function in `planner/services/` that checks every date in `[start_date, end_date]` has ≥1 Meal, raising `HttpError(400)` with German message on gap
- [x] 1.2 Create `smart_merge_days(meal_plan, new_start, new_end)` function that deletes meals outside new range and creates default meals for missing dates inside new range
- [x] 1.3 Create `shrink_range_on_delete(meal_plan, deleted_date)` helper that updates start/end datetime after edge day deletion, handling single-day plans (→ both NULL)

## 2. Backend — API-Endpunkt-Änderungen

- [x] 2.1 Modify `add_day` (`POST /{id}/days/`): auto-extend range if date is outside, then validate contiguity
- [x] 2.2 Modify `remove_day` (`DELETE /{id}/days/`): identify if date is edge or middle, reject middle with 400, shrink range on edge delete, then validate contiguity
- [x] 2.3 Modify `update_meal_plan` (`PATCH /{id}/`): detect actual change to start/end, call `smart_merge_days()` if changed, then validate contiguity
- [x] 2.4 Verify `add_day_before` / `add_day_after` still work correctly (they already maintain contiguity by construction)

## 3. Frontend — Fehlerbehandlung

- [x] 3.1 Update `useRemoveDay` error handling in `MealEventDetailPage.tsx` to display the new 400 error message when a middle day cannot be deleted
- [x] 3.2 Verify that the existing "Tag davor"/"Tag danach" UI flow works correctly with the new backend validation

## 4. Tests

- [x] 4.1 Write tests for `validate_meal_plan_contiguity`: full coverage, gap in middle, no range, no meals at all
- [x] 4.2 Write tests for `smart_merge_days`: extend range, shrink range, shift entirely, no-op
- [x] 4.3 Write tests for `add_day` endpoint: add day before/after/in-range, duplicate day, gap validation after addition
- [x] 4.4 Write tests for `remove_day` endpoint: delete first/last/middle day, delete single-day plan
- [x] 4.5 Write tests for `update_meal_plan` PATCH with range change: smart merge triggered, no-op when same values
- [x] 4.6 Write tests for `add_day_before` / `add_day_after`: verify contiguity is maintained
- [x] 4.7 Write tests for authorization: unauthenticated, viewer role blocked from day operations
