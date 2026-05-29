## 1. Backend: API-Response erweitern

- [x] 1.1 `RecipeCostOut` Schema erstellen in `backend/planner/schemas/meal_plan.py` (recipe_id, recipe_title, recipe_slug, total_cost, cost_per_person)
- [x] 1.2 `MealPlanCostSummaryOut` um `recipes: list[RecipeCostOut] = []` Feld erweitern
- [x] 1.3 `cost_summary` Endpunkt in `backend/planner/api/meal_plan.py` erweitern: Rezept-Kosten pro Plan aggregieren und im Response zurückgeben

## 2. Frontend: Zod-Schema aktualisieren

- [x] 2.1 Zod-Schema für MealPlanCosts in `frontend-food/src/schemas/mealPlan.ts` um `recipes`-Array erweitern (passend zum Pydantic-Schema)

## 3. Frontend: CostDashboard.tsx erweitern

- [x] 3.1 Summary Cards erweitern: "Pro Pers./Tag"-Card hinzufügen
- [x] 3.2 Neue Sektion: Rezeptkosten-Liste mit Links zu Rezept-Detailseiten
- [x] 3.3 Hinweis-Banner mit Link zu `/ingredients` am Ende ergänzen

## 4. Frontend: /cost-calculation entfernen

- [x] 4.1 Route aus `frontend-food/src/App.tsx` entfernen
- [x] 4.2 `frontend-food/src/pages/tools/CostCalculationPage.tsx` löschen
- [x] 4.3 Tool-Eintrag `cost-calculation` aus `frontend-food/src/lib/toolColors.ts` entfernen
- [x] 4.4 Eventuelle Navigation/Links auf `/cost-calculation` im Projekt suchen und entfernen
