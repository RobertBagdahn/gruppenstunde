## 1. Backend-Bugfixes (NameError)

- [x] 1.1 `nutrition.py:298-302`: 5× `servings` → `portions` in den per_serving-return-Werten
- [x] 1.2 `shopping/api.py:456`: 1× `servings` → `portions` in der weight_g-Formel

## 2. Frontend-Bugfixes (API-Key-Mismatch)

- [x] 2.1 `RecipeDetailPage.tsx:697`: Payload-Key `servings` → `portions` im forkAndSaveRecipe-Aufruf
- [x] 2.2 `RecipeDetailPage.tsx:736`: Payload-Key `servings` → `portions` im updateRecipe-Aufruf
- [x] 2.3 `EditRecipePage.tsx`: State `servings`/`setServings` → `portions`/`setPortions` umbenennen + Payload-Key anpassen

## 3. Fehlende Frontend-Bausteine nachliefern

- [x] 3.1 `schemas/supply.ts`: Export `NUTRI_SCORE_COLORS_BY_LETTER` hinzufügen (A–E mit bg/text)
- [x] 3.2 `schemas/recipe.ts`: Zod-Schema `RecipeTypeStatsSchema` definieren (Match zu Pydantic `RecipeTypeStatsOut`)
- [x] 3.3 `api/recipes.ts`: Hook `useRecipeTypeStats(recipeType: string)` definieren

## 4. Analyse-Tab-Komponenten erstellen

- [x] 4.1 `PriceTab.tsx`: Preis-Analyse + `RecipeCategoryBenchmark` mit metric="price"
- [x] 4.2 `NutritionTab.tsx`: Inhaltsstoff-Analyse + `RecipeCategoryBenchmark` mit metric="energy"
- [x] 4.3 `HealthTab.tsx`: Gesundheits-Analyse + `RecipeNutriScoreDistribution`
- [x] 4.4 `WeightTab.tsx`: Gewichts-Analyse + `RecipeCategoryBenchmark` mit metric="weight"

## 5. Analyse-Tabs in RecipeDetailPage verdrahten

- [x] 5.1 `RecipeAnalysisTabs` importieren und die 4 Tab-Komponenten als Tabs-Array übergeben
- [x] 5.2 Die 4 alten `AnalysisSection`-Accordions (Preis, Inhaltsstoffe, Gesundheit, Gewicht) entfernen
- [x] 5.3 RecipeRulesBox nach den Tabs positionieren (bleibt als separate Sektion)

## 6. Section-Reihenfolge + Zubereitung

- [x] 6.1 Zubereitung (`AnalysisSection` mit description) direkt nach Zutaten verschieben, `defaultOpen={true}`
- [x] 6.2 Themen-Tags und Nutritional Tags nach Zubereitung verschieben (vor Analyse-Tabs)
- [x] 6.3 Analyse-Tabs nach den Tags positionieren

## 7. PortionScaler + ScaleIngredientsDialog

- [x] 7.1 `PortionScaler.tsx`: `showFactors`-Prop hinzufügen (+ Quick-Select-Buttons 0.5×, 1.5×, 2×)
- [x] 7.2 `RecipeDetailPage.tsx`: Import + State + JSX für `ScaleIngredientsDialog` entfernen
- [x] 7.3 `scaleByFactor`-Aufruf aus `ScaleIngredientsDialog` in `PortionScaler` integrieren (über `onChange`)

## 8. Migration + Tests

- [x] 8.1 `uv run python manage.py makemigrations` (keine Model-Änderungen nötig — reine Python-Variablen-Renames)
- [x] 8.2 `uv run pytest recipe/tests/ -x -v` (15 passed)
- [x] 8.3 `uv run pytest supply/tests/test_shopping_service.py -x -v` (3 passed)

## 9. Verifikation

- [x] 9.1 `npm run build` in `frontend-food/` erfolgreich (keine neuen Fehler — verbleibende Errors sind pre-existing in planning/recipe_similar)
- [ ] 9.2 Visueller Check: Analyse-Tabs mit allen 4 Tabs wechselbar
- [ ] 9.3 Kategorie-Benchmarking sichtbar (wenn genug Rezepte gleichen Typs existieren)
- [ ] 9.4 PortionScaler mit showFactors-Buttons
- [ ] 9.5 Zubereitung default aufgeklappt nach Zutaten
