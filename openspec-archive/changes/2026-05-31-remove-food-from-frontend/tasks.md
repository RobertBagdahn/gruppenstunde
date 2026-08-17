## 1. Food-Code aus dem Haupt-Frontend entfernen

- [x] 1.1 Food-Routen aus `frontend/src/App.tsx` entfernen (`/recipes/*`, `/meal-plans/*`)
- [x] 1.2 Recipe Pages löschen (`frontend/src/pages/recipes/` — alle 6 Dateien + CookingMode)
- [x] 1.3 MealPlan Pages löschen (`frontend/src/pages/tools/MealPlan*`, `MealEvent*`, `CreateMealPlanPage`)
- [x] 1.4 IngredientDetailPage löschen (`frontend/src/pages/supplies/IngredientDetailPage.tsx`)
- [x] 1.5 Recipe Components löschen (`frontend/src/components/recipe/` — alle Dateien)
- [x] 1.6 Shopping Components löschen (`frontend/src/components/shopping/` — alle Dateien)
- [x] 1.7 IngredientList Component löschen (`frontend/src/components/supply/IngredientList.tsx`)
- [x] 1.8 Food API-Hooks löschen (`frontend/src/api/recipes.ts`, `ingredients.ts`, `mealPlans.ts`, `mealEvents.ts`, `shoppingLists.ts`, `normPerson.ts`, `recipeHints.ts` + Tests)
- [x] 1.9 Food Schemas löschen (`frontend/src/schemas/recipe.ts`, `ingredient.ts`, `mealPlan.ts`, `mealEvent.ts`, `shoppingList.ts`)
- [x] 1.10 Food Stores löschen (`frontend/src/store/useRecipeModificationStore.ts` + Test)
- [x] 1.11 Food Utils/Libs löschen (`frontend/src/utils/nutritionCalculator.ts` + Test, `frontend/src/lib/parseRecipeSteps.ts` + Test)
- [x] 1.12 WebSocket Hook löschen (`frontend/src/hooks/useShoppingListWebSocket.ts`)

## 2. Referenzen bereinigen

- [x] 2.1 `recipe` aus ApprovalQueuePage entfernen (`frontend/src/pages/admin/ApprovalQueuePage.tsx`)
- [x] 2.2 `'recipe'` Referenz aus TitleImageEditor entfernen (`frontend/src/components/content/TitleImageEditor.tsx`)
- [x] 2.3 Navigation/Links zu Food-Seiten suchen und entfernen (Header, Footer, Landing Pages, Sidebar)
- [x] 2.4 Tote Imports und Referenzen aufräumen (TypeScript-Build muss fehlerfrei durchlaufen)

## 3. Approval Queue im Food-Frontend

- [x] 3.1 Approval API-Hook in `frontend-food/src/api/` erstellen (oder bestehenden Content-Approval-Endpunkt anbinden)
- [x] 3.2 `ApprovalTab.tsx` in `frontend-food/src/pages/admin/` erstellen (Liste pending Recipes, Approve/Reject Buttons)
- [x] 3.3 ApprovalTab in AdminPage Tab-Navigation registrieren

## 4. AGENTS.md aktualisieren

- [x] 4.1 `frontend/AGENTS.md` — Regel hinzufügen: Kein Food-Code im Haupt-Frontend
- [x] 4.2 Root `AGENTS.md` — Food-Frontend-Abschnitt um Trennungsregel ergänzen

## 5. Verifizierung

- [x] 5.1 `frontend/` Build fehlerfrei (`npm run build`) — keine food-bezogenen Fehler
- [x] 5.2 `frontend-food/` Build fehlerfrei (`npm run build`) — keine neuen Fehler durch ApprovalTab
