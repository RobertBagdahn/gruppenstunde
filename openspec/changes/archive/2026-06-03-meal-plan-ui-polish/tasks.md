## 1. Table View Enhancements

- [x] 1.1 Implement the daily total row ("Tagessumme") at the bottom of the table (`tfoot` or final table row in `TableView.tsx`) displaying aggregated daily energy in kcal and daily costs in €.
- [x] 1.2 Improve table styling with clearer border-collapse, subtle background colors for empty cells, and refined item padding/font sizes.

## 2. PAL Label Mapping & Settings Panel Selector

- [x] 2.1 Centralize the PAL level to human-readable label mapping utility function/dictionary.
- [x] 2.2 Update the meal plan detail header display to show the German activity category alongside the raw PAL factor.
- [x] 2.3 Refactor the Settings Panel inside `MealEventDetailPage.tsx` to replace the raw numeric PAL factor input with a clean select dropdown.
- [x] 2.4 Update the `NormPortionSimulatorPage.tsx` to display PAL labels and use mapped descriptions for all simulator options.

## 3. Nutrition Cockpit Day-by-Day Selector

- [x] 3.1 Implement the horizontal Day-by-Day selector (clickable badges/buttons showing weekday and date) alongside a leading "Gesamt" button inside `NutritionView`.
- [x] 3.2 Update `NutritionView` selection state and interaction to reload/refetch the specific day-by-day nutrition aggregates upon selecting a day.

## 4. Verification

- [x] 4.1 Run the frontend build and lint commands to ensure there are no compilation or type checking errors.
