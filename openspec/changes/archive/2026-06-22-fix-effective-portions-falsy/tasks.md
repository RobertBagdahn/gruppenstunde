## 1. Backend: Meal.effective_portions korrigieren

- [x] 1.1 `backend/planner/models/meal_plan.py:352`: `return self.override_portions or self.meal_plan.norm_portions or 1` → explizite `None`-Prüfung (siehe Design D1)

## 2. Frontend: effectivePortions korrigieren

- [x] 2.1 `frontend-food/src/schemas/mealPlan.ts:396`: `meal.override_portions || normPortions || 1` → explizite `null`/`undefined`-Prüfung (siehe Design D1)

## 3. Verifikation

- [x] 3.1 Backend-Test: Meal mit `override_portions=None` → `effective_portions == norm_portions`
- [x] 3.2 Backend-Test: Meal mit `override_portions=5` → `effective_portions == 5`
- [x] 3.3 Frontend: `effectivePortions({ override_portions: null }, 10)` → `10`
- [x] 3.4 Frontend: `effectivePortions({ override_portions: 5 }, 10)` → `5`
