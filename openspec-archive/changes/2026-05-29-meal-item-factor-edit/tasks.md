## 1. Backend — PATCH-Endpunkt

- [x] 1.1 Pydantic-Schema `MealItemUpdateIn` erstellen in `planner/schemas/meal_plan.py` mit `factor: float | None = None`
- [x] 1.2 PATCH-Endpunkt `/{meal_plan_id}/meal-items/{item_id}/` in `planner/api/meal_plan.py` implementieren (authentifiziert, gibt `MealItemOut` zurück)

## 2. Frontend — API-Layer

- [x] 2.1 Mutation-Funktion `updateMealItem` in `frontend-food/src/api/mealPlans.ts` hinzufügen (PATCH mit `{ factor }`)
- [x] 2.2 TanStack Query Mutation Hook `useUpdateMealItem` erstellen mit Cache-Invalidierung

## 3. Frontend — UI

- [x] 3.1 Inline-Input-Komponente für Factor in `MealEventDetailPage.tsx` einbauen (immer sichtbar, Prefix "×", Breite ~60px)
- [x] 3.2 Debounced Save implementieren (on blur + Enter → Mutation aufrufen)
