## 1. Food-Schemas entfernen

- [x] 1.1 `frontend/src/schemas/normPerson.ts` komplett löschen
- [x] 1.2 In `frontend/src/schemas/supply.ts`: Alle Ingredient-spezifischen Exports entfernen (IngredientListItemSchema, IngredientDetailSchema, PaginatedIngredientSchema, PortionSchema, IngredientAliasSchema, RecipeHintSchema, RecipeHintMatchSchema, NutriScoreDetailSchema, NUTRI_SCORE_COLORS, IngredientSuggestAllSchema, PortionSuggestionSchema). Nur Material-spezifische Schemas behalten
- [x] 1.3 Alle Importe der entfernten Schemas in anderen Haupt-Frontend-Dateien aufräumen

## 2. Food-API-Hooks entfernen

- [x] 2.1 `frontend/src/api/supplies.ts` löschen (Ingredient-CRUD, Portion-Hooks, AI-Suggest-Hooks)
- [x] 2.2 Alle Importe von `useIngredients`, `useIngredient`, `useCreateIngredient`, `useUpdateIngredient`, `useDeleteIngredient`, `usePortions`, `useCreatePortion`, `useAiSuggestIngredientAll`, `useAiCreateIngredient` in Haupt-Frontend-Dateien aufräumen
- [x] 2.3 `useNutritionalTags`-Import in `PersonsPage.tsx` entfernen oder Page umschreiben ohne Food-Abhängigkeit

## 3. Food-Utilities entfernen

- [x] 3.1 `frontend/src/lib/unitConversion.ts` löschen
- [x] 3.2 `frontend/src/lib/portionDisplay.ts` löschen
- [x] 3.3 Alle Importe dieser Utilities im Haupt-Frontend aufräumen

## 4. Food-Components entfernen

- [x] 4.1 `frontend/src/components/charts/NutrientBalanceChart.tsx` löschen
- [x] 4.2 `frontend/src/components/charts/NutritionPieChart.tsx` löschen
- [x] 4.3 `frontend/src/components/shared/AiSuggestDialog.tsx` löschen
- [x] 4.4 Alle Importe dieser Components im Haupt-Frontend aufräumen

## 5. Verwaiste Pages entfernen

- [x] 5.1 `frontend/src/pages/MaterialPage.tsx` löschen (keine Route in App.tsx)

## 6. Food-Referenzen bereinigen

- [x] 6.1 In `frontend/src/schemas/privacy.ts`: `shopping_lists` aus `CategorySchema` entfernen (Food-Domain-Data-Kategorie)
- [x] 6.2 In `frontend/src/pages/SearchPage.tsx`: Recipe-spezifische Metadaten-Anzeige entfernen (recipe_type, servings bleiben im Schema, aber UI zeigt sie nicht extra an)
- [x] 6.3 In `frontend/src/components/SearchBar.tsx`: "Rezepten" aus Placeholder-Text entfernen falls der Food-Frontend-Link noch nicht steht
- [x] 6.4 In `frontend/src/pages/HomePage.tsx` und `MyDashboardPage.tsx`: "Rezept"/"Rezepte"-Referenzen prüfen und ggf. entfernen falls sie ins Food-Frontend linken würden

## 7. TypeScript kompilieren und linten

- [x] 7.1 `npm run typecheck` ausführen und alle TypeScript-Fehler beheben
- [x] 7.2 `npm run lint` ausführen und alle Lint-Fehler beheben
