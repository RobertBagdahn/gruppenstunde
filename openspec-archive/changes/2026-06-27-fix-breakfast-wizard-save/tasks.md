## 1. Backend — RefMealCreateIn + Items ✅

- [x] 1.1 `RefMealCreateIn` in `backend/planner/schemas/meal_plan.py` um `items: list[RefMealItemIn] | None = None` erweitern
- [x] 1.2 `create_ref_meal` in `backend/planner/api/ref_meal.py`: nach `meal.save()` Items aus `payload.items` als `MealItem` anlegen (gleiche Logik wie in `update_ref_meal`)
- [x] 1.3 `create_ref_meal` gibt das erstellte Meal mit Items zurück (bestehende `RefMealOut`-Response nutzen)

## 2. Backend — Tests ✅

- [x] 2.1 Test: POST `/ref-meals/` mit `items` erstellt MealItems korrekt
- [x] 2.2 Test: POST `/ref-meals/` ohne `items` erstellt leeres RefMeal (bestehendes Verhalten)
- [x] 2.3 Bestehende Tests ausführen: `uv run pytest planner/tests/test_ref_meal.py -xvs` → 17 passed

## 3. Frontend — Getränke im handleSave mappen ✅

- [x] 3.1 `BreakfastWizardPage.tsx`: `handleSave` erweitern — aus `state.drinks` MealItems mit `display_name` und `quantity` (ml) bauen
- [x] 3.2 Getränke-Mapping: Kaffee → `display_name: "Kaffee"`, Kakao → `display_name: "Kakao"`, Tee → `display_name: "Tee"` mit jeweils `quantity = mlPerPerson × (percent/100)`. Milch separat als `display_name: "Milch"` mit `quantity = coffeeMilkMlPerPerson + cocoaMilkMlPerPerson`

## 4. Frontend — Redirect nach Save ✅

- [x] 4.1 `BreakfastWizardPage.tsx`: `handleSave` nutzt Mutations-Response (bereits async/await)
- [x] 4.2 Redirect von `navigate(/meal-plans/${planId})` auf `navigate(/meal-plans/${planId}/ref-meals/breakfast)` geändert
- [x] 4.3 Redirect funktioniert sowohl für neue (POST) als auch bestehende (PUT) RefMeals

## 5. Frontend — SaveWizard Mutation Return-Value ✅

- [x] 5.1 `frontend-food/src/api/breakfast.ts`: `saveWizardRefMeal` gibt `RefMealSchema.parse` zurück — enthält `id`
- [x] 5.2 `useSaveBreakfastWizard` Mutation: `mutateAsync` reicht den Rückgabewert durch

## 6. Validierung ✅

- [ ] 6.1 Manuell testen: Wizard öffnen, Basis/Belag/Getränke konfigurieren, speichern → RefMeal enthält Items
- [ ] 6.2 Manuell testen: Bestehendes RefMeal erneut mit Wizard öffnen, ändern, speichern → Items werden aktualisiert
- [ ] 6.3 Manuell testen: Nach Save landet man auf dem RefMeal-Editor (`/meal-plans/:id/ref-meals/breakfast`)
- [x] 6.4 TypeScript-Check: `cd frontend-food && npx tsc --noEmit` — keine neuen Fehler
