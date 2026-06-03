## 1. Frontend: TableView & Detail Page

- [x] 1.1 Update `TableViewProps` in `TableView.tsx` to include `budgetPerPersonPerDay?: number | null`
- [x] 1.2 Pass `budget_per_person_per_day` from `MealEventDetailPage.tsx` to `TableView` as `budgetPerPersonPerDay`
- [x] 1.3 Calculate `costPerPerson` inside `TableView.tsx` footer cells for each scheduled day
- [x] 1.4 Add the dynamic, color-coded budget status badge below daily kcal/cost in the table footer of `TableView.tsx`

## 2. Verification & Styling Check

- [x] 2.1 Verify that the budget indicator is hidden when no budget is defined
- [x] 2.2 Verify that green, yellow, and red boundaries are correctly formatted and styled
- [x] 2.3 Run full React frontend compilation (`npm run build`) to ensure there are no TypeScript errors
