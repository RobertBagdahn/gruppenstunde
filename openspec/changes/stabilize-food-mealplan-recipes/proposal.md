## Why

Der Food-Frontend-Build (`npm run build`) schlägt mit ~80 TypeScript-Fehlern fehl. MealPlan-Karten importieren entfernte Felder und Typen (`AmpelStatus`, `getAmpel`, `status`, `portions`), Ingredient-Statistics-Tabs referenzieren nicht existierende API-Hooks, und vier View-Tabs (Shopping, Nutrition, Cost, MealSlot, Table) lesen `allergen_tag` statt des Backend-korrekten `nutritional_tag`. Gleichzeitig ist die Tag-Semantik fachlich falsch verdrahtet: RecipeSearch zeigt „Nur Vegan“ und filtert auf Rezepte _mit_ verbotenen Tags, statt sie auszuschließen. MealPlan-Nährwerte ignorieren Direktzutaten und Reserve, Kostenrechnung ist uneinheitlich. Der Schnitt muss grün und fachlich konsistent werden.

## What Changes

- **Tag-Semantik auf „Verbote" vereinheitlichen**: MealPlan-Tags bedeuten Ausschluss. RecipeSearch und RecipeSuggestions filtern Rezepte mit diesen Tags _aus_ (Backend: `exclude_nutritional_tag_ids` bereits vorhanden, Frontend muss es nutzen).
- **`allergen_tag` → `nutritional_tag`**: Fünf Frontend-Komponenten auf das Backend-konforme Schema umstellen.
- **MealPlan-Karten neu bauen** (**BREAKING**): `MealPlanHeroCard` und `MealPlanCompactCard` auf aktuelles `MealPlanSchema` migrieren. Entfernte Felder (`status`, `filled_meals_count`, `portions`, Ampelsystem) durch schema-konforme Alternativen ersetzen (`visibility`, `meals_count`, `norm_portions`, Coverage-Neuberechnung).
- **Ingredient-Statistics-Tabs reparieren**: Fehlende API-Hooks ergänzen oder Tabs auf vorhandene Hooks umbauen.
- **Rezept-Portionierung endgültig auf 1 Normportion**: Create-UI entfernt das irreführende Portionen-Feld. RecipeImport nutzt korrektes Feld `servings` (nicht `portions`). RecipePreviewDialog verwendet `portions` nur wo vorhanden.
- **`nutritionCalculator.ts` und `RefMealEditorPage.tsx`** Syntax-Fehler beheben (doppelte Properties, falscher Variablenname).
- **Collaborators/Share/VerifiedBadge** Build-Fehler beheben (unused imports, fehlende Typen).
- **Backend-Test-Fehler**: Recipe-Cache-Delete-Tests und Fork-Recipe-Tests reparieren.

## Capabilities

### New Capabilities

Keine neuen Capabilities — dieser Change stabilisiert und korrigiert bestehende Funktionalität.

### Modified Capabilities

- `meal-plan`: Tag-Semantik von neutral auf „Verbote" geändert. RecipeSearch/RecipeSuggestions müssen Rezepte mit MealPlan-Tags ausschließen, nicht einschließen.
- `meal-plan-frontend`: MealPlan-Karten (`MealPlanHeroCard`, `MealPlanCompactCard`) auf aktuelles `MealPlanSchema` migriert. Altes Ampelsystem entfernt.
- `ingredient-statistics`: API-Hooks für Distribution/Ranking/Scatter/Outliers/TagLists/Scores sind nicht mehr verfügbar. Tabs müssen auf existierende Hooks umgebaut oder die API-Endpunkte wiederhergestellt werden.
- `recipe-portion-normalization`: Create-UI entfernt das editierbare Portionen-Feld. Import nutzt `servings`-Feldname. Portions-Override wird strikt auf 1 erzwungen — kein UI-Workaround mehr möglich.
- `recipe-preview-dialog`: Typ `RecipeSearchResult` hat kein `portions`-Feld. Preview-Dialog muss auf verfügbare Felder (`cached_energy_kcal` direkt) umgestellt werden.
- `recipe-url-import`: Zod-Schema `RecipeDraftSchema` nutzt `servings`, CreatePage las `portions`. Auf `servings` vereinheitlicht.
- `recipe-rules-display`: `AllergenWarningBadge`-Prop heißt `allergenTags`, Schema heißt `nutritional_tag`. Komponenten müssen `nutritional_tag` aus Violation extrahieren und als `NutritionalTag[]` übergeben.

## Impact

- **Frontend**: `MealPlanHeroCard.tsx`, `MealPlanCompactCard.tsx`, `MealPlanFilterChips.tsx`, `ShoppingView.tsx`, `NutritionView.tsx`, `CostDashboard.tsx`, `MealSlot.tsx`, `TableView.tsx`, `AllergenScanView.tsx`, `RecipeSearchDialog.tsx`, `CreateRecipePage.tsx`, `RecipePreviewDialog.tsx`, `RefMealEditorPage.tsx`, `nutritionCalculator.ts`, `RecipeDetailPage.tsx`, `MyRecipesPage.tsx`, `ShareDialog.tsx`, `VerifiedBadge.tsx`, `usePermissions.ts`, `collaborators.ts`, ~20 Statistic-Tabs, `RecipeImportPage.tsx`, `RecipeCard.tsx`
- **Backend**: `recipe/tests/test_cache_signals.py`, `recipe/tests/test_personal_recipes.py`
- **Schemas**: `frontend-food/src/schemas/mealPlan.ts` (ShoppingListItemSchema um `portion_options` und `ingredient_id` ergänzen), `frontend-food/src/api/recipeImport.ts` (Konsistenz prüfen), `frontend-food/src/api/supplies.ts` (fehlende Hooks ggf. ergänzen)
- **Keine Datenbank-Migration** — rein Schema-/Frontend-/Test-Fix
