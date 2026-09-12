# Tasks: fix-critical-meal-plan-integrity-bugs

## 1. Backend / Sicherheit & KI
- [x] 1.1 `backend/planner/services/meal_plan_ai_service.py`: `_get_breakfast_candidates` auf Templates, verifizierte und eigene Pläne beschränken.
- [x] 1.2 `backend/planner/api/ref_meal.py`: Sichtbarkeit von `recipe_id` und `ingredient_id` via `food_access` vor dem Anlegen prüfen.
- [x] 1.3 `backend/planner/services/meal_plan_ai_service.py`: Sichtbarkeitsprüfung bei `apply_suggestions` integrieren.
- [x] 1.4 `backend/planner/services/meal_plan_ai_service.py`: `measuring_unit_id` beim Speichern von Zutaten-Vorschlägen ermitteln und setzen.
- [x] 1.5 `backend/planner/models/meal_plan.py`: `MealTypeChoices.DRINKS` ergänzen.

## 2. Backend / Berechnungen, PDF & Duplikation
- [x] 2.1 `backend/planner/services/pdf_export.py`: `_build_allergen_matrix` so anbinden, dass reale Allergene pro Tag ermittelt werden.
- [x] 2.2 `backend/planner/services/pdf_export.py`: Mengenskalierung (Eintragsfaktor, Einheitenmenge, aktive Varianten) in `_get_recipe_ingredients` korrigieren.
- [x] 2.3 `backend/planner/api/meal_plan.py`: In `duplicate_meal_plan` und `copy_items_from_plan` die Felder `active_recipe_item_ids` und `variant_group_id` mitspeichern.
- [x] 2.4 `backend/supply/services/shopping_service.py` & `backend/planner/api/meal_plan.py`: Mahlzeiten mit `is_external=True` von der Zutaten-Einkaufslisten- und Nährwert-Aggregation ausschließen.
- [x] 2.5 Tests in `backend/planner/tests/` für PDF-Allergene, Duplikations-Varianten, Drinks-Typ und externe Mahlzeiten ausführen bzw. ergänzen.

## 3. Frontend / Berechnungen & Dialoge
- [x] 3.1 `frontend-food/src/pages/planning/RecipeSearchDialog.tsx`: Übergabe von Portionsmenge vs. Gesamtgramm bereinigen.
- [x] 3.2 `frontend-food/src/pages/planning/RecipeSearchDialog.tsx`: Suchfeld auch im Zutaten-Modus aktiv halten.
- [x] 3.3 `frontend-food/src/lib/refMealToWizardState.ts`: Doppelte Division durch `normPortions` bei bereits personenbasierten Mengen entfernen.
- [x] 3.4 `frontend-food/src/components/meal/VariantSliderDialog.tsx`: Formel in `handlePortionChange` korrigieren, sodass `largestRemainderRound` echte Anteile erhält.
- [x] 3.5 `frontend-food/src/schemas/mealPlan.ts` & `TableView.tsx`: `drinks` in `MEAL_TYPE_ORDER`, Labels, Farben und Tabelle einbinden.
- [x] 3.6 `frontend-food/src/pages/planning/TableView.tsx`: Vorzeitigen Löschtoast entfernen; Toast mit Undo erst nach bestätigtem Löschen in `MealEventDetailPage.tsx` anzeigen.
- [x] 3.7 `frontend-food/src/components/planning/MealActionsMenu.tsx`: Klick auf Frühstücksassistent verlinkt mit `mealId=${meal.id}`, um nur diesen Tag zu editieren.
- [x] 3.8 `frontend-food/src/pages/planning/wizard/StepAiPrompt.tsx`: „Anderen Prompt ausprobieren“ setzt `ai_suggestions` auf null zurück.
- [x] 3.9 `frontend-food/src/pages/planning/SuggestionsView.tsx`: Tagesbalken mit echten Tageswerten statt des Plandurchschnitts rendern.
- [x] 3.10 Vitest-Tests für geänderte Logik ausführen und anpassen.

## 4. Verifikation & Integration
- [x] 4.1 `uv run pytest` im Backend für alle geänderten Module ausführen.
- [x] 4.2 `npm test` im `frontend-food/` ausführen.
- [x] 4.3 `make check` bzw. Typechecks auf beiden Seiten prüfen.
