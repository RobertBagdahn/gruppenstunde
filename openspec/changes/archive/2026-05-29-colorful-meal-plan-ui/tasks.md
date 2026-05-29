## 1. Backend: MealItem/Meal Schema-Erweiterung

- [x] 1.1 Add `energy_kj: float | None` and `cost_eur: float | None` fields to `MealItemOut` in `backend/planner/schemas/meal_plan.py` with `resolve_energy_kj` and `resolve_cost_eur` static methods that calculate from `obj.recipe.cached_energy_kj` / `obj.recipe.cached_price_total` scaled by `factor * (meal.meal_plan.norm_portions / recipe.servings)`
- [x] 1.2 Add `total_energy_kj: float` and `total_cost_eur: float` fields to `MealOut` with resolve methods that sum items' values (treating None as 0)
- [x] 1.3 Ensure queryset uses `select_related('recipe', 'meal__meal_plan')` so resolve methods don't cause N+1 queries

## 2. Frontend: Zod Schema Sync

- [x] 2.1 Add `energy_kj: z.number().nullable()` and `cost_eur: z.number().nullable()` to `MealItemSchema` in `frontend-food/src/schemas/mealPlan.ts`
- [x] 2.2 Add `total_energy_kj: z.number()` and `total_cost_eur: z.number()` to `MealSchema`

## 3. Frontend: Farbsystem & Konstanten

- [x] 3.1 Create `MEAL_TYPE_COLORS` constant map in `frontend-food/src/schemas/mealPlan.ts` mapping meal types to Tailwind color classes (breakfast=orange, lunch=cyan, dinner=indigo, snack=amber, dessert=pink)
- [x] 3.2 Create helper function `getCoverageStatus(totalEnergyKj: number, dayPartFactor: number, activityFactor: number)` returning `{percent: number, status: 'good'|'warning'|'critical'}` — in a new utility file or inline in the page

## 4. Frontend: Tagesplan Tab Redesign

- [x] 4.1 Restyle `DayPlanView` day header: larger font (`text-base sm:text-lg font-bold`), more visual weight
- [x] 4.2 Restyle `MealSlot` header: apply `MEAL_TYPE_COLORS` accent (colored left border or icon color), increase font to `text-base font-semibold`
- [x] 4.3 Add coverage percentage badge next to meal type label showing `getCoverageStatus` result with green/yellow/red color
- [x] 4.4 Restyle meal items: show `energy_kj` (converted to kcal) and `cost_eur` inline below recipe name in `text-sm text-muted-foreground`
- [x] 4.5 Style empty meals (items.length === 0): red-tinted background (`bg-red-50 border-red-200`), red icon, red text
- [x] 4.6 Style all add buttons green: `text-green-600 hover:bg-green-50` for add-recipe, add-meal-type, add-day buttons
- [x] 4.7 Increase all font sizes per design doc (recipe name text-base, secondary info text-sm, buttons text-sm)

## 5. Frontend: Other Tabs Farblogik

- [x] 5.1 `TableView.tsx`: Add red accent for empty meal cells, green for filled, yellow for partial coverage
- [x] 5.2 `CostDashboard.tsx`: Highlight incomplete pricing (priced_ingredients < total_ingredients) with yellow/red badge
- [x] 5.3 Shopping/Einkaufsliste view: Apply green/red color coding where applicable
- [x] 5.4 Cockpit tab: Verify existing traffic-light colors are consistent with new color scheme (green-600, yellow-600, red-600)

## 6. Verifizierung

- [x] 6.1 Run `uv run python manage.py check` to verify backend changes
- [x] 6.2 Run frontend TypeScript check (`npm run typecheck` or equivalent) in frontend-food
- [x] 6.3 Visually verify all 6 tabs render correctly with test data
