## 1. Backend — RefMealCreateIn + Items

- [ ] 1.1 `RefMealCreateIn` in `backend/planner/schemas/meal_plan.py` um `items: list[RefMealItemIn] | None = None` erweitern
- [ ] 1.2 `create_ref_meal` in `backend/planner/api/ref_meal.py`: nach `meal.save()` Items aus `payload.items` als `MealItem` anlegen (gleiche Logik wie in `update_ref_meal`)
- [ ] 1.3 `create_ref_meal` gibt das erstellte Meal mit Items zurück (bestehende `RefMealOut`-Response nutzen)

## 2. Backend — Tests

- [ ] 2.1 Test: POST `/ref-meals/` mit `items` erstellt MealItems korrekt
- [ ] 2.2 Test: POST `/ref-meals/` ohne `items` erstellt leeres RefMeal (bestehendes Verhalten)
- [ ] 2.3 Bestehende Tests ausführen: `uv run pytest planner/tests/test_ref_meal.py -xvs`

## 3. Frontend — Getränke im handleSave mappen

- [ ] 3.1 `BreakfastWizardPage.tsx`: `handleSave` erweitern — aus `state.drinks` MealItems mit `display_name` und `quantity` (ml) bauen
- [ ] 3.2 Getränke-Mapping: Kaffee → `display_name: "Kaffee"`, Kakao → `display_name: "Kakao"`, Tee → `display_name: "Tee"` mit jeweils `quantity = mlPerPerson × (percent/100)`. Milch separat als `display_name: "Milch"` mit `quantity = coffeeMilkMlPerPerson + cocoaMilkMlPerPerson`

## 4. Frontend — Redirect nach Save

- [ ] 4.1 `BreakfastWizardPage.tsx`: `handleSave` gibt Response-ID zurück — `const result = await saveWizard.mutateAsync(...)`
- [ ] 4.2 Redirect von `navigate(/meal-plans/${planId})` auf `navigate(/meal-plans/${planId}/ref-meals/breakfast)` ändern
- [ ] 4.3 Redirect funktioniert sowohl für neue (POST) als auch bestehende (PUT) RefMeals

## 5. Frontend — SaveWizard Mutation Return-Value

- [ ] 5.1 `frontend-food/src/api/breakfast.ts`: `saveWizardRefMeal` gibt das geparste `RefMeal`-Objekt zurück (tut sie bereits — prüfen ob `RefMealSchema.parse` das `id`-Feld erfasst)
- [ ] 5.2 `useSaveBreakfastWizard` Mutation: sicherstellen dass `mutateAsync` den Rückgabewert korrekt durchreicht

## 6. Validierung

- [ ] 6.1 Manuell testen: Wizard öffnen, Basis/Belag/Getränke konfigurieren, speichern → RefMeal enthält Items
- [ ] 6.2 Manuell testen: Bestehendes RefMeal erneut mit Wizard öffnen, ändern, speichern → Items werden aktualisiert
- [ ] 6.3 Manuell testen: Nach Save landet man auf dem RefMeal-Editor (`/meal-plans/:id/ref-meals/breakfast`)
- [ ] 6.4 TypeScript-Check: `cd frontend-food && npx tsc --noEmit`
