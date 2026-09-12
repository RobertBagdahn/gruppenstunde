## Why

In the current meal planner table view (`TableView.tsx`), ingredient items in meal slots (especially breakfast items originating from reference meals or the breakfast wizard) suffer from critical flexbox squashing and text overlapping bugs, duplicate name labels, and uneditable portion quantities. Furthermore, users lack immediate budget transparency because financial totals are buried at the very bottom in the table footer, breakfast slots vertically bloat the grid with up to a dozen individual cards, and adding or removing items requires cumbersome nested dropdown menus.

## What Changes

- **Fix Item Card Layout in Table & Slot Views**: Resolve flexbox collisions and text overlap in meal items by eliminating `shrink-0` text collisions, removing redundant ingredient titles when `portion_display` already includes the name (or formatting quantity/unit cleanly), and giving items a robust 2-line structure.
- **Interactive Quantity / Factor Input for Ingredients**: Enable direct inline adjustment of ingredient portions/quantities in the table view (matching capabilities in `MealSlot.tsx`), rather than rendering a static non-editable badge.
- **Compact Breakfast Presentation in Grid**: Introduce a compact/collapsible representation for breakfast buffets (grouping bread, spreads, warm components, drinks) to prevent vertical slot explosion and preserve day-level overview.
- **Sticky Budget & Nutrition Cockpit**: Introduce an always-visible top cockpit bar above the plan/table views displaying daily budget (target vs. actual), total plan cost, remaining funds, calorie target progress, and color-coded status badges (green/yellow/red).
- **Direct Quick Actions for Slots**: Add direct 1-click action triggers (`+ Rezept`, `+ Zutat`) directly visible within meal slots for editors instead of requiring a 3-click submenu navigation, and ensure remove buttons (`X`) remain accessible without requiring precise mouse hover.
- **Undo Toast on Item Removal**: Provide a quick undo action via toast when removing a meal item so users can rapidly curate meals without destructive confirmation modals.
- **Responsive Grid & Spacing Hardening**: Improve horizontal table scroll, minimum column dimensions, and table header sticky behavior so edge days and portion counts do not clip on tablets and compact viewports.

## Capabilities

### New Capabilities
- `meal-plan-budget-cockpit`: Sticky top summary bar providing real-time budget, per-person-per-day cost tracking, calorie coverage indicators, and quick status alerts across meal plan views.

### Modified Capabilities
- `meal-plan-table-view`: Updated requirements for collision-free item rendering, compact breakfast slots, inline quantity editing for ingredients, direct quick-add/remove controls, and responsive column layout.

## Impact

- **Affected Frontend Components**:
  - `frontend-food/src/pages/planning/TableView.tsx` (major layout overhaul, breakfast grouping, item card structure, quick add buttons)
  - `frontend-food/src/pages/planning/MealSlot.tsx` (layout alignment and quick action parity)
  - `frontend-food/src/pages/planning/MealEventDetailPage.tsx` (embedding sticky budget cockpit)
  - `frontend-food/src/components/planning/MealActionsMenu.tsx` (cleaner slot actions)
  - `frontend-food/src/pages/planning/QuantityInput.tsx` / `FactorInput.tsx` (re-used for ingredients in table view)
- **Schemas**:
  - Existing Zod and Pydantic schemas in `schemas/mealPlan.ts` and `planner/schemas/meal_plan.py` remain compatible; no database migration is required.
