## 1. Backend – Schema & Endpoint

- [x] 1.1 Add `CopyItemsFromPlanIn` Pydantic schema to `backend/planner/schemas/meal_plan.py` (source_plan_id, source_meal_id, item_ids: list[int] | None)
- [x] 1.2 Add `copy_items_from_plan` endpoint to `backend/planner/api/meal_plan.py` (`POST /{plan_id}/meals/{meal_id}/copy-items-from/`)
- [x] 1.3 Remove old `copy_meal_item` endpoint and `CopyMealItemIn` schema (replaced by new cross-plan endpoint)
- [x] 1.4 Write backend tests for the new endpoint (successful copy, synced target rejected, no-access plan rejected)

## 2. Frontend – Schema & API Hook

- [x] 2.1 Add `CopyItemsFromPlanIn` Zod schemas to `frontend-food/src/schemas/mealPlan.ts`
- [x] 2.2 Add `useCopyItemsFromPlan(planId)` mutation hook to `frontend-food/src/api/mealPlans.ts`
- [x] 2.3 Remove old `useCopyMealItem` hook and `CopyMealItemIn`/`CopyMealItemInSchema` (replaced)

## 3. Frontend – CopyFromPlanDialog

- [x] 3.1 Create `CopyFromPlanDialog.tsx` in `frontend-food/src/pages/planning/` with multi-step UI (plan → day → meal → items)
- [x] 3.2 Implement step 1: Plan list (useMealPlans, filter out current plan)
- [x] 3.3 Implement step 2: Day selection from selected plan's meals (useMealPlan)
- [x] 3.4 Implement step 3: Meal type selection from selected day
- [x] 3.5 Implement step 4: Item checkboxes + copy button with selected count
- [x] 3.6 Handle loading/empty/error states for each step
- [x] 3.7 Remove old `CopyMealItemDialog.tsx` (replaced)

## 4. Frontend – Integration

- [x] 4.1 Wire `CopyFromPlanDialog` into `MealEventDetailPage.tsx` (state: copyDialogTarget for meal-level, meal ID + optional context)
- [x] 4.2 Add "Aus anderem Plan kopieren" entry to `MealActionsMenu.tsx`
- [x] 4.3 Replace old Copy button icon in `MealSlot.tsx` with "Aus anderem Plan kopieren" that opens the dialog
- [x] 4.4 Remove old `onCopyItem` prop chain from `MealSlot` → `DayPlanView` → `MealEventDetailPage`
- [x] 4.5 Verify dialog opens from both entry points (menu + item button) and copies items correctly
