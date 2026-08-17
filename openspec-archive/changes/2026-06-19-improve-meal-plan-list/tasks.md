## 1. Backend: filled_meals_count

- [x] 1.1 Add `filled_meals_count: int = 0` field to `MealPlanOut` in `backend/planner/schemas/meal_plan.py`
- [x] 1.2 Add `filled_meals_count` annotation to `list_meal_plans` queryset in `backend/planner/api/meal_plan.py` using `Count('meals', filter=Q(meals__items__isnull=False), distinct=True)`
- [x] 1.3 Add import for `Count` and `Q` at top of `backend/planner/api/meal_plan.py`
- [x] 1.4 Verify `list_meal_plans` returns correct `filled_meals_count` by testing with `uv run python manage.py shell`

## 2. Frontend: Schema sync

- [x] 2.1 Add `filled_meals_count: z.number()` to `MealPlanSchema` in `frontend-food/src/schemas/mealPlan.ts`
- [x] 2.2 Verify TypeScript compilation: `npm run typecheck` in `frontend-food/`

## 3. Frontend: Utility functions

- [x] 3.1 Create `getAmpel(plan)` function in `frontend-food/src/schemas/mealPlan.ts` returning `'green' | 'yellow' | 'red'` based on `filled_meals_count / meals_count`
- [x] 3.2 Create `getCountdown(startDatetime)` function returning German countdown text (e.g. "Noch 12 Tage", "Heute", "Morgen", "Läuft bereits")
- [x] 3.3 Create `getDaysCount(startDatetime, endDatetime)` function returning number of days in plan range
- [x] 3.4 Create `splitPlansIntoSections(allPlans)` function that splits flat plan array into `{top5, weitere, referenz, vergangen}`

## 4. Frontend: Hero card component

- [x] 4.1 Create `frontend-food/src/components/planning/MealPlanHeroCard.tsx` with props `{ plan, userId }`
- [x] 4.2 Implement card layout: colored left border matching Ampel status, name, badge, event link, date range, countdown
- [x] 4.3 Implement progress bar: colored bar with percentage and "X/Y Mahlzeiten" text
- [x] 4.4 Implement info row: portions + reserve, budget (if set), nutritional tags (if set)
- [x] 4.5 Implement quick action buttons: "Öffnen", "Einkaufsliste", context menu (MoreVertical)
- [x] 4.6 Add click handler on "Einkaufsliste" button: navigate to `/meal-plans/:id?tab=shopping`

## 5. Frontend: Compact card component

- [x] 5.1 Create `frontend-food/src/components/planning/MealPlanCompactCard.tsx` with props `{ plan, userId, showAmpel, showProgress }`
- [x] 5.2 Implement compact layout: Ampel dot, name, badge, date range, meal count, portions, event name
- [x] 5.3 Optionally show mini progress bar when `showProgress` is true (for "Weitere" section)
- [x] 5.4 For reference plans: show "Als Vorlage verwenden" action instead of delete
- [x] 5.5 Add click handler: navigate to `/meal-plans/:id`

## 6. Frontend: Section component

- [x] 6.1 Create `frontend-food/src/components/planning/MealPlanSection.tsx` with props `{ title, icon, plans, defaultOpen, variant }`
- [x] 6.2 Implement collapsible header with ChevronDown/ChevronRight, title, plan count
- [x] 6.3 Implement `variant` switching: `'hero'` renders MealPlanHeroCard list, `'compact'` renders grid of MealPlanCompactCard
- [x] 6.4 Implement toggle behavior with local `useState` for open/closed

## 7. Frontend: Filter chips

- [x] 7.1 Create `frontend-food/src/components/planning/MealPlanFilterChips.tsx` with Ampel filter chips (Alle, 🟢 Bereit, 🟡 In Arbeit, 🔴 Lückenhaft)
- [x] 7.2 Add time-range filter chips (Diese Woche, Nächste Woche, Nächster Monat)
- [x] 7.3 Implement chip selection state and callback via props
- [x] 7.4 Implement filtering logic: combine Ampel filter + time-range filter + existing search filter

## 8. Frontend: Rebuild list page

- [x] 8.1 Refactor `MealEventListPage.tsx`: replace flat plan grid with section-based layout
- [x] 8.2 Integrate filter chips between search bar and sections
- [x] 8.3 Wire `splitPlansIntoSections` to compute four sections from `useMealPlans` data
- [x] 8.4 Apply Ampel and time-range filters to sections (filter in-memory, not via API)
- [x] 8.5 Render Top-5 section with `MealPlanSection variant="hero" defaultOpen=true`
- [x] 8.6 Render "Weitere Pläne" section with `MealPlanSection variant="compact" showProgress=true defaultOpen=false` (hidden when upcoming plans ≤ 5)
- [x] 8.7 Render "Referenzpläne" section with `MealPlanSection variant="compact" defaultOpen=false`
- [x] 8.8 Render "Vergangene Pläne" section with `MealPlanSection variant="compact" defaultOpen=false`
- [x] 8.9 Remove old inline `PlanCard` and `PlanSection` components from the page
- [x] 8.10 Remove old `pastOpen` state and flat futurePlans/pastPlans split logic
- [x] 8.11 Update `MealPlanFilterSidebar` usage: remove or keep only for origin filter (tbd during implementation)
- [x] 8.12 Keep existing create dialog, delete confirmation, and duplicate logic intact

## 9. Polish and verify

- [x] 9.1 Test on mobile (320px): hero cards stack vertically, compact cards in 1-column grid
- [x] 9.2 Test on desktop: compact cards in 3-column grid, hero cards full width
- [x] 9.3 Verify Ampel colors are correct with test data (0%, 50%, 100% coverage)
- [x] 9.4 Verify countdown shows correct values (today, tomorrow, future, running, no dates)
- [x] 9.5 Verify section collapse/expand works correctly
- [x] 9.6 Verify "Einkaufsliste" quick action navigates with correct tab parameter
- [x] 9.7 Verify "Als Vorlage verwenden" on reference plans opens create dialog with plan pre-selected
- [x] 9.8 Run `npm run typecheck` and `npm run lint` in frontend-food to verify no errors
- [x] 9.9 Test create and delete flow still works with new layout
