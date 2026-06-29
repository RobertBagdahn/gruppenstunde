## 1. Backend — Erweiterte Ingredient-Query

- [x] 1.1 In `planner/api/meal_plan.py` in der `search_recipes`-Funktion die Ingredient-Query von `values("id", "name", "slug")` auf alle relevanten Felder erweitern: `energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `nutri_class`, `price_per_kg`, `usage_count`, `description`, `status`
- [x] 1.2 Nutritional-Tags für Ingredients laden (M2M-Join analog zum Recipe-Code) und an jedes Ingredient-Dict anhängen

## 2. Frontend Schema — IngredientSearchResultSchema erweitern

- [x] 2.1 In `frontend-food/src/schemas/mealPlan.ts` das `IngredientSearchResultSchema` um Felder erweitern: `energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `nutri_class`, `price_per_kg`, `usage_count`, `description`, `status`, `nutritional_tags`
- [x] 2.2 `UnifiedSearchResponseSchema` und `IngredientSearchResult`-Type prüfen (sollten automatisch upgedatet sein)

## 3. Frontend Component — Unified SearchResultCard

- [x] 3.1 `RecipeSearchCard` (`frontend-food/src/components/recipe/RecipeSearchCard.tsx`) zu `SearchResultCard` umbauen: akzeptiert Union-Typ `RecipeSearchResult | IngredientSearchResult`, discriminated union per `"recipe_type" in result` vs `"status" in result`
- [x] 3.2 Für Recipes: bestehendes Rendering beibehalten (BookOpen-Icon, recipe_badge, RECIPE_TYPE_LABELS, price_per_serving)
- [x] 3.3 Für Ingredients: Apple-Icon, Badge aus `status` mappen (verified→ShieldCheck, user_content→Users, draft→Edit), Typ-Label "Zutat", Preis aus `price_per_kg` formatiert als "X,XX €/kg"
- [x] 3.4 `RecipeSearchCard` als re-export für andere Importeure erhalten (Deprecation-Hinweis optional)

## 4. Frontend Dialog — Suchfeld + Mixed Results

- [x] 4.1 In `RecipeSearchDialog.tsx` einen `q`-State einführen, gebunden an ein `<input>`-Feld ganz oben im Dialog (oberhalb der CategoryPills), mit Placeholder "Suchen..."
- [x] 4.2 300ms-Debounce per `useEffect` + `setTimeout`/`clearTimeout`: nach 300ms ohne Tastatureingabe den `q`-Wert an `useRecipeSearch` übergeben
- [x] 4.3 `useRecipeSearch`-Aufruf um `q`-Parameter erweitern
- [x] 4.4 "Kürzlich verwendet" conditional rendern: `showRecentlyUsed = q.length < 2 && recentlyUsedData?.recipes?.length > 0`
- [x] 4.5 Ergebnisliste umbauen: statt getrennter `<div>`-Blöcke für recipes und ingredients eine einzige Liste mit `SearchResultCard`-Komponenten (recipes + ingredients in einem Array concat, mit recipes zuerst)
- [x] 4.6 ingredient-only-mode prüfen: dort bleibt das bisherige Verhalten erhalten (kein Suchfeld, keine gemischten Ergebnisse)

## 5. Qualitätssicherung

- [x] 5.1 TypeScript-Lint und Build checken: `cd frontend-food && npx tsc --noEmit`
- [x] 5.2 Backend-Tests für die erweiterte Ingredient-Query prüfen: `cd backend && uv run python manage.py test planner.tests`
