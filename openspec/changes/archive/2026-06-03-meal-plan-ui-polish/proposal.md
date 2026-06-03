## Why

The current meal planning interface needs a UX and visual polish to improve usability and readability for scout leaders. Specifically, the meal plan table layout, PAL (Physical Activity Level) display and configuration, and the nutrition cockpit are functional but lack clear visual hierarchy, intuitive control flows, and elegant relative indicators instead of raw absolute values.

## What Changes

- **Improved Table View**: Refactor the main planning table (`TableView.tsx`) to be more visually polished, adding clear daily energy totals (summing across meal slots) and better styling for cell content, empty states, and slots.
- **Human-Readable PAL Labels**: Replace raw numeric PAL display and input (e.g., "1.6") with descriptive German labels (e.g., "leicht", "mittel", "schwer") across the header, settings panel, and simulator to make PAL factors intuitive for users.
- **Relative Indicators Integration**: Refactor key values to emphasize relative "Ist / Soll" ratio-based indicators and badges instead of absolute numbers.
- **Enhanced Nutrition Cockpit**: Add a Day-by-Day selector (a 7-day style bar selector) and a "Gesamt" (All Days) toggle to the nutrition cockpit view, allowing leaders to focus on nutrition trends for a single day or the whole event.
- **Budget Cockpit Polish**: Enhance budget/cost visualization with clean relative indicators or indicators mapping back to the cockpit.

## Capabilities

### New Capabilities
- `meal-plan-ui-polish`: Visual and interactive enhancements to the meal planning layout, including table cell-level Soll/Ist summaries, human-readable activity factor labels, and granular day-specific filters for the nutrition cockpit.

### Modified Capabilities
- `meal-plan-frontend`: Update existing frontend requirements to support day-selective nutrition cockpit rendering and mapping PAL numeric ranges to human-readable categories.

## Impact

- **Affected Code**: `frontend-food/src/pages/planning/MealEventDetailPage.tsx`, `frontend-food/src/pages/planning/TableView.tsx`, `frontend-food/src/pages/planning/NutritionView.tsx`, `frontend-food/src/pages/tools/NormPortionSimulatorPage.tsx`.
- **APIs & Schemas**: No backend schema modifications or database migrations are required, as these are client-side UI and visualization enhancements.
