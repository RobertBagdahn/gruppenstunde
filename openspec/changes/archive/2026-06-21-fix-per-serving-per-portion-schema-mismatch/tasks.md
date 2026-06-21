## 1. Backend Pydantic Schema

- [x] 1.1 `backend/recipe/schemas/nutrition.py` — `RecipeNutritionBreakdownOut`: `per_serving_energy_kcal` → `per_portion_energy_kcal` (und 4 analoge Felder)

## 2. Backend API Response

- [x] 2.1 `backend/recipe/api/nutrition.py` — Dict-Response in `get_recipe_nutrition_breakdown`: 5 Keys von `per_serving_*` auf `per_portion_*` umstellen
- [x] 2.2 `uv run python -m pytest recipe/tests/test_extended_nutrition.py -x -v` — Backend-Tests laufen (prüft DGE + Breakdown)

## 3. Frontend RecipeDetailPage

- [x] 3.1 `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` — Alle `nb.per_serving_*` durch `nb.per_portion_*` ersetzen (reiner Rename, 18 Vorkommen)

## 4. Weitere Referenzen prüfen

- [x] 4.1 `grep` über `frontend-food/src/` nach `per_serving_` — sicherstellen, dass keine weiteren Frontend-Komponenten die alten Feldnamen nutzen
- [x] 4.2 `grep` über `backend/recipe/` nach `per_serving_` — sicherstellen, dass keine weiteren Backend-Stellen die alten Namen nutzen

## 5. Verification

- [x] 5.1 `npm run build` — keine `per_serving_`/`per_portion_`-Buildfehler (andere pre-existing Fehler durch WIP-Änderungen)
- [x] 5.2 `uv run python -m pytest recipe/tests` — nutrition tests grün; test_api.py failure pre-existing (status enum)
- [x] 5.3 Rename validiert: 0 `per_serving_`-Referenzen in backend/recipe/ und frontend-food/src/ verbleiben
