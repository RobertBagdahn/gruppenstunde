## 1. Frontend: Nutrition Fallback Values in NutritionView

- [x] 1.1 Define the `NUTRITION_FALLBACKS` constant inside `frontend-food/src/pages/planning/NutritionView.tsx` containing default DGE guideline values.
- [x] 1.2 Update active rule finding logic in `NutritionView.tsx` to fallback to the defined guidelines if no matching rule is loaded from the API.

## 2. Frontend: Grouped Bar Chart in NutrientBalanceChart

- [x] 2.1 Update invocation of `<LazyNutrientBalanceChart>` inside `NutritionView.tsx` to pass the number of days (`numDays`) and the `showPerPortion` flag.
- [x] 2.2 Update the interface and prop-types of `NutrientBalanceChart.tsx` to accept `numDays` and `showPerPortion` alongside nutrient values.
- [x] 2.3 Refactor chart data mapping in `NutrientBalanceChart.tsx` to include `Soll` target values, scaled dynamically based on number of days and portions if applicable.
- [x] 2.4 Adjust `<BarChart>` inside `NutrientBalanceChart.tsx` to display grouped bars (Ist and Soll) for each nutrient parameter. Use an outlined or semi-transparent style for the Soll bar.
- [x] 2.5 Polish the `<Tooltip>` of `NutrientBalanceChart.tsx` to display actual values and target ranges.

## 3. Verification & Quality Checks

- [x] 3.1 Verify rendering, color palette consistency, and Mobile-First responsiveness on narrow viewports.
- [x] 3.2 Run frontend production build (`npm run build` or `tsc`) to ensure no compilation errors or linter issues.
