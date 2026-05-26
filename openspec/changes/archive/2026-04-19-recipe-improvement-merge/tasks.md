# Implementation Tasks — recipe-improvement-merge

## 1. Backend — Ranking Service

- [x] 1.1 Neuer Service `backend/recipe/services/improvement_ranking_service.py` anlegen
- [x] 1.2 Funktion `compute_improvement_ranking(recipe) -> dict` implementieren: sammelt Kandidaten aus `nutri_improvement_service` und `match_recipe_hints`
- [x] 1.3 Helper `_score_nutri_candidate(candidate) -> float` für `impact_score`-Beitrag aus Nutri-Delta (`class_improvement / 4.0`, clamp 0–1)
- [x] 1.4 Helper `_score_recipe_hint(hint, actual_value) -> float` für `impact_score`-Beitrag aus Hint-Überschreitung (clamp 0–1)
- [x] 1.5 Kombinationsformel `clamp(0, 100, 50 * nutri_component + 50 * hint_component)`
- [x] 1.6 Deduplizierung nach `parameter`-Key: Bei Kollision Texte mit `\n\n` joinen, höheren Score behalten, `source = 'merged'`
- [x] 1.7 `all_good`-Logik: `cached_nutri_class == 1 AND len(matched_hints) == 0`
- [x] 1.8 Threshold-Ermittlung: RecipeHint `min_value`/`max_value` primär (je nach `min_max`), Nutri-Punktgrenze als Fallback
- [x] 1.9 Suggested-Ingredients aus bestehender Helper-Funktion `_find_contributing_ingredients` in `nutri_improvement_service.py` ziehen und um `id`-Feld erweitern

## 2. Backend — Schemas

- [x] 2.1 Pydantic-Schema `ImprovementOut` in `backend/recipe/schemas/nutrition.py` mit allen Feldern (parameter, parameter_label, current_value, threshold_value, delta, unit, direction, impact_score, suggested_ingredients, source, recommendation_text)
- [x] 2.2 Pydantic-Schema `SuggestedIngredientOut` (id, name, contribution_g)
- [x] 2.3 Pydantic-Schema `ImprovementListOut` (items, all_good, message)
- [x] 2.4 Alte Schemas `NutriImprovementOut`, `RecipeHintMatchOut`, `RecipeHintOut` entfernen; `__init__.py`-Re-Exports anpassen

## 3. Backend — API

- [x] 3.1 Endpoint `GET /api/recipes/{id}/improvements/` in `backend/recipe/api/nutrition.py` hinzufügen, ruft `compute_improvement_ranking` auf
- [x] 3.2 Endpoint `GET /api/recipes/{id}/nutri-improvements/` entfernen
- [x] 3.3 Endpoint `GET /api/recipes/{id}/recipe-hints/` entfernen
- [x] 3.4 `nutri_improvement_service.py`: Hardcoded `candidates[:3]` entfernen, Funktion gibt alle Kandidaten zurück, Limit macht der Ranking-Service
- [x] 3.5 `match_recipe_hints` in `recipe_checks.py` bleibt unverändert als Helper, wird vom Ranking-Service importiert

## 4. Backend — Tests

- [x] 4.1 `backend/recipe/tests/test_improvement_ranking.py` anlegen
- [x] 4.2 Test: Rezept mit Nutri-Score C + überschrittener Salt-Hint → Salt-Eintrag gemergt, `source = 'merged'`
- [x] 4.3 Test: Rezept mit Nutri-Score C, keine RecipeHints → Items aus Nutri-Simulation, `source = 'nutri_score'`
- [x] 4.4 Test: Rezept mit Nutri-Score A, keine überschrittenen Hints → `all_good = true`, `items = []`
- [x] 4.5 Test: Dedup-Logik mit zwei konkurrierenden Quellen für `sugar_g`
- [x] 4.6 Test: Ranking respektiert Limit von 5 (auch wenn 8 Kandidaten vorhanden)
- [x] 4.7 Test: `threshold_value` aus RecipeHint vs. Nutri-Punktgrenze als Fallback
- [x] 4.8 `uv run pytest recipe/tests/test_improvement_ranking.py` grün

## 5. Frontend — Schemas und Hooks

- [x] 5.1 Zod-Schema `ImprovementSchema` in `frontend/src/schemas/recipe.ts` anlegen (synchron zu Pydantic)
- [x] 5.2 Zod-Schema `SuggestedIngredientSchema`, `ImprovementListSchema`
- [x] 5.3 Alte Schemas `NutriImprovementSchema`, `RecipeHintMatchSchema` entfernen
- [x] 5.4 Neuer Hook `useRecipeImprovements(recipeId)` in `frontend/src/api/recipes.ts`
- [x] 5.5 Alte Hooks `useNutriImprovements`, `useRecipeHints` entfernen
- [x] 5.6 Re-Exports in `frontend/src/api/ingredients.ts` / `frontend/src/schemas/ingredient.ts` entsprechend anpassen

## 6. Frontend — RecipeImprovements Komponente

- [x] 6.1 Neue Komponente `frontend/src/components/recipe/RecipeImprovements.tsx`
- [x] 6.2 Karten-Layout: Parameter-Icon, Label, Current-Threshold-Delta-Visualisierung, Zutaten-Chips, Empfehlungstext
- [x] 6.3 Delta-Visualisierung: Fortschrittsbalken von 0 bis Schwellenwert, aktueller Wert markiert; Delta-Text darunter
- [x] 6.4 „Details"-Button nur wenn `source !== 'nutri_score'`; öffnet bestehenden `HintDetailModal`
- [x] 6.5 All-Good-Zustand: Erfolgs-Card mit Check-Icon und `message`-Text rendern
- [x] 6.6 Loading- und Error-States (Skeleton bzw. deutsche Fehlermeldung)
- [x] 6.7 Accessibility: Karten sind `<article>`, Delta-Werte mit `aria-label`

## 7. Frontend — Detailseite umbauen

- [x] 7.1 `NutriImprovementCards`-Import und -Verwendung aus `RecipeDetailPage.tsx` entfernen
- [x] 7.2 Alten Recipe-Hints-JSX-Block aus `RecipeDetailPage.tsx` entfernen
- [x] 7.3 `<RecipeImprovements recipeId={...} />` an der Stelle der bisherigen NutriImprovementCards rendern
- [x] 7.4 Datei `frontend/src/components/recipe/NutriImprovementCards.tsx` löschen

## 8. Verifikation

- [x] 8.1 `npx tsc --noEmit` grün
- [x] 8.2 Lint grün (falls möglich)
- [x] 8.3 `uv run pytest recipe` grün (modulo bekannter pre-existing Failures)
- [x] 8.4 Manueller Test: Rezept mit mittlerem Nutri-Score → 5 Items sichtbar, gemergte Einträge korrekt
- [x] 8.5 Manueller Test: Rezept mit Nutri-Score A → All-Good-Card sichtbar
- [x] 8.6 Manueller Test: Details-Modal öffnet sich bei RecipeHint-Karten, nicht bei reinen Nutri-Score-Karten
- [x] 8.7 Network-Tab: Nur noch `/improvements/` Requests, keine `/nutri-improvements/` oder `/recipe-hints/`

## 9. OpenSpec Archive (nach Merge)

- [x] 9.1 `openspec validate recipe-improvement-merge --strict` erfolgreich
- [x] 9.2 Via `openspec archive recipe-improvement-merge` archivieren
