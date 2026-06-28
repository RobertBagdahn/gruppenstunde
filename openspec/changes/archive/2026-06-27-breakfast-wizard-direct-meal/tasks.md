## 1. Backend: Pydantic-Schemas

- [x] 1.1 `WizardItemsIn` und `WizardItemsOut` in `backend/planner/schemas/meal_plan.py` definieren und in `__init__.py` re-exportieren

## 2. Backend: API-Endpoint

- [x] 2.1 `POST /api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/` in `backend/planner/api/meal_plan.py` implementieren: Meal und MealPlan-Zugehörigkeit validieren, existierende Items löschen, neue Items per `bulk_create` erstellen (alles in `transaction.atomic()`)
- [x] 2.2 Tests für den Endpoint schreiben: leeres Meal befüllen, bestehende Items überschreiben, atomarer Rollback bei ungültigem Item, 404 bei nicht existierendem Meal, 404 bei Meal gehört nicht zum Plan

## 3. Frontend: Zod-Schema + API-Hook

- [x] 3.1 `WizardItemsResponse` Zod-Schema in `frontend-food/src/schemas/breakfast.ts` ergänzen (passt zu `WizardItemsOut`)
- [x] 3.2 `useSaveDirectMeal` TanStack Query Hook in `frontend-food/src/api/breakfast.ts` erstellen (Mutation, POST zum Batch-Endpoint, invalidiert `meal-plan` Query)

## 4. Frontend: Wizard-Mode-Refactoring

- [x] 4.1 `BreakfastWizardPage` um `saveMode` unterscheiden: `saveMode` aus URL-Parametern ableiten (`mealId` vorhanden → `directMeal`, sonst `refMeal`)
- [x] 4.2 `handleSave` je nach Mode unterschiedliche Save-Funktion aufrufen und unterschiedliches Redirect-Ziel setzen
- [x] 4.3 Im `directMeal`-Mode: keinen RefMeal laden, keinen `existingRefMeal` State nutzen, Button-Text "Frühstück speichern" bleibt gleich

## 5. Frontend: Routing

- [x] 5.1 Neue Route `/meal-plans/:id/meals/:mealId/breakfast-wizard` in `frontend-food/src/App.tsx` registrieren, die denselben `BreakfastWizardPage`-Component rendert

## 6. Frontend: MealSlot-Button + Warn-Dialog

- [x] 6.1 "Frühstücksassistent"-Button im `MealSlot.tsx` einbauen — nur sichtbar wenn `meal.meal_type === 'breakfast'`, `canEdit`, `!meal.is_external`. Bei leerem Slot: prominenter Button unter dem CTA. Bei befülltem Slot: kompakter Button in der Header-Zeile.
- [x] 6.2 Warn-Dialog (shadcn/ui AlertDialog) im MealSlot: Wenn `meal.items.length > 0`, vor Navigation zu `/meal-plans/{planId}/meals/{mealId}/breakfast-wizard` Bestätigungsdialog zeigen mit Text "Dieses Frühstück enthält bereits Einträge. Der Assistent wird alle vorhandenen Einträge ersetzen. Fortfahren?" und Buttons "Abbrechen" / "Trotzdem ersetzen"

## 7. Integration-Test

- [ ] 7.1 Manueller Durchlauf: MealPlan öffnen → Frühstück-Slot → Assistent-Button klicken → Wizard durchlaufen → Speichern → Items erscheinen im MealSlot
- [ ] 7.2 Manueller Durchlauf: Frühstück mit Items → Assistent-Button klicken → Warn-Dialog erscheint → Bestätigen → Wizard → Speichern → Alte Items weg, neue Items da
- [ ] 7.3 Manueller Durchlauf: RefMeal-Assistent über `/ref-meals/breakfast/wizard` testen (Regressions-Test — muss unverändert funktionieren)
