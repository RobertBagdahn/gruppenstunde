## 1. Helper & Formatting

- [x] 1.1 Create `frontend-food/src/utils/formatItemDisplay.ts` with clean ingredient portion/quantity formatting and unit tests
- [x] 1.2 Implement helper functions for breakfast item aggregation and summary calculation in `frontend-food/src/utils/formatItemDisplay.ts`

## 2. Item Card Overhaul & Layout Fixes

- [x] 2.1 Refactor Item Card layout in `frontend-food/src/pages/planning/TableView.tsx` into a robust 2-line grid without `shrink-0` text collisions
- [x] 2.2 Fix ingredient title duplication by avoiding full portion strings when the ingredient name is already displayed
- [x] 2.3 Enable interactive factor and quantity adjustments for ingredient items in `TableView.tsx`
- [x] 2.4 Make delete button touch-accessible and add undo-toast workflow on item deletion

## 3. Compact Breakfast Buffet & Slot Quick Actions

- [x] 3.1 Implement collapsible buffet card for breakfast slots with multiple ingredients in `TableView.tsx`
- [x] 3.2 Add direct `+ Rezept` and `+ Zutat` quick action triggers in `TableView.tsx`
- [x] 3.3 Align item card and quick-action layout in `frontend-food/src/pages/planning/MealSlot.tsx`

## 4. Sticky Budget & Nutrition Cockpit

- [x] 4.1 Create `frontend-food/src/components/planning/MealPlanBudgetCockpit.tsx` with live budget calculation, remaining amount, kcal progress, and color indicators
- [x] 4.2 Embed `MealPlanBudgetCockpit` in `frontend-food/src/pages/planning/MealEventDetailPage.tsx`
- [x] 4.3 Ensure table min-widths, horizontal scroll behaviour, and header responsiveness on tablet viewports

## 5. Verification & Tests

- [x] 5.1 Run frontend unit tests and TypeScript check (`npm run test`, `npx tsc`)
- [x] 5.2 Execute Playwright E2E tests for meal planning to verify layout and interaction integrity
