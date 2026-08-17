## 1. Backend: Cost-Aggregation

- [x] 1.1 Pydantic-Schemas erstellen (`MealCostSchema`, `DayCostSchema`, `MealPlanCostSummarySchema`) in `backend/planner/schemas/meal_plan.py`
- [x] 1.2 Cost-Berechnungslogik implementieren (Iteration über Meals → MealItems → RecipeItems → Ingredients, Skalierung mit Faktoren und Portionen)
- [x] 1.3 API-Endpoint `GET /api/planner/meal-plans/{id}/costs/` in `backend/planner/api/meal_plan.py` erstellen

## 2. Frontend: Zod-Schemas und API-Client

- [x] 2.1 Zod-Schemas für Cost-Summary in `frontend-food/src/schemas/mealPlan.ts` ergänzen
- [x] 2.2 API-Client-Funktion `getMealPlanCosts(id)` in `frontend-food/src/api/mealPlans.ts` hinzufügen
- [x] 2.3 TanStack Query Hook `useMealPlanCosts(id)` erstellen

## 3. Frontend: Tabellen-Tab

- [x] 3.1 Komponente `TableView.tsx` erstellen (Grid: Tage × Mahlzeittypen, Zellen mit Rezeptname + Portionen)
- [x] 3.2 Mobile-Responsive: Horizontaler Scroll für schmale Bildschirme
- [x] 3.3 Tab "Tabelle" in `MealPlanDetailPage.tsx` einbinden

## 4. Frontend: Kosten-Tab

- [x] 4.1 Komponente `CostDashboard.tsx` erstellen (Gesamtkosten, pro Person, Tabelle pro Tag)
- [x] 4.2 Hinweis bei unvollständigen Preisdaten ("geschätzt, X von Y Zutaten mit Preis")
- [x] 4.3 Tab "Kosten" in `MealPlanDetailPage.tsx` einbinden
