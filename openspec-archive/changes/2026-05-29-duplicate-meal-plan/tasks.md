## 1. Backend: Schema + Endpunkt

- [x] 1.1 Neues Pydantic-Schema `MealPlanDuplicateIn` in `backend/planner/schemas/meal_plan.py` erstellen (name: str, start_datetime: datetime, norm_portions: int)
- [x] 1.2 Neuen Endpunkt `POST /api/meal-plans/{slug}/duplicate/` in `backend/planner/api/meal_plan.py` implementieren
- [x] 1.3 Duplikations-Logik: Plan kopieren, end_datetime berechnen, alle Meals mit Offset kopieren, alle MealItems kopieren — in `transaction.atomic()`
- [x] 1.4 Sicherstellen dass Collaborators, MealItemOverrides und Notizen NICHT kopiert werden

## 2. Frontend: API + Schema

- [x] 2.1 Zod-Schema `mealPlanDuplicateSchema` in `frontend-food/src/schemas/mealPlan.ts` erstellen
- [x] 2.2 `useDuplicateMealPlan` Mutation in `frontend-food/src/api/mealPlans.ts` erstellen

## 3. Frontend: UI

- [x] 3.1 "Als Vorlage verwenden" Option im Kontextmenü der Plan-Karten in `MealEventListPage.tsx` hinzufügen
- [x] 3.2 Duplicate-Dialog mit drei Pflichtfeldern (Name, Start-Datum, Portionen) erstellen
- [x] 3.3 Nach erfolgreichem Duplizieren zur Detail-Seite des neuen Plans navigieren
