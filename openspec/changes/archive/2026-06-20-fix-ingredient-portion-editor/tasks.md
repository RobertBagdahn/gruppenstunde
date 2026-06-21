## 1. Backend: AI-Quantity-Estimate Portion-Fix

- [x] 1.1 In `backend/recipe/schemas/items.py`: `EstimateQuantityItemOut` um Feld `portion_id: int` erweitern
- [x] 1.2 In `backend/recipe/services/ai_ingredients_service.py::_build_response`: Statt `default_portion` immer `item.portion` als `target_portion` verwenden (die aktuell gespeicherte Portion des Items). `portion_id = item.portion_id` in Response aufnehmen.
- [x] 1.3 In `backend/recipe/services/ai_ingredients_service.py::_build_response`: `weight_g` aus `target_portion.weight_g` (aktuelle Portion) statt Default-Portion berechnen
- [x] 1.4 Backend-Test in `backend/recipe/tests/test_ai_quantity_estimation.py`: Teste dass Response `portion_id` enthält und = `item.portion_id`; teste Schätzung mit Item in "Esslöffel"-Portion

## 2. Backend: AI-Apply Dedup-Schutz

- [x] 2.1 In `backend/recipe/api/items.py::ai_apply_ingredients`: Vor dem Create-Loop alle `payload`-Einträge filtern, deren `portion_id` eine `Portion.ingredient_id` hat, die bereits in einem existierenden `RecipeItem` des Rezepts vorkommt. Gefilterte Einheiten überspringen.
- [x] 2.2 Cache-Recalculation nur triggern wenn mindestens ein Item erstellt wurde (nicht bei leerer Filter-Liste)
- [x] 2.3 Backend-Test: Apply mit Duplikat → nur Nicht-Duplikate werden erstellt; Apply mit allen Duplikaten → leere Response, keine Cache-Recalc

## 3. Frontend: EstimateQuantityItem-Schema synchronisieren

- [x] 3.1 In `frontend-food/src/schemas/recipe.ts`: `EstimateQuantityItem`-Typ um `portion_id: number` erweitern (Zod-Schema synchron zum Backend-Pydantic-Schema)

## 4. Frontend: InlineIngredientEditor — Add-Field UX

- [x] 4.1 In `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` (Zeile 517–531): Das `IngredientAutocomplete` in einen Card-Container einbetten mit `border-border`, `bg-card`, `rounded-xl`, `p-3` und einem Lucide `Plus`-Icon sowie Label "Zutat hinzufügen"
- [x] 4.2 Sicherstellen, dass das Input weiterhin vollbreitbar ist und die Dropdown-Liste korrekt über dem Card-Container schwebt (z-index prüfen)

## 5. Frontend: InlineIngredientEditor — Duplikat-Prüfung & Restore

- [x] 5.1 In `handleAddIngredient` (Zeile 178): Bevor neues Item angelegt wird, prüfen ob `ingredient.id` in `editItems` existiert (matched via `ingredient_id`)
- [x] 5.2 Falls gefunden und `isDeleted: true`: bestehendes Item auf `isDeleted: false, isDirty: true` setzen, Toast "Zutat bereits vorhanden – wiederhergestellt" (sonder), `setInputValue('')`, return
- [x] 5.3 Falls gefunden und `isDeleted: false`: Toast "Zutat bereits vorhanden" (info), `setInputValue('')`, return
- [x] 5.4 Falls nicht gefunden: bestehende Logik (smart default, neues Item anlegen)

## 6. Frontend: InlineIngredientEditor — AI-Suggest Filter & CSRF

- [x] 6.1 In `handleAiSuggest` (Zeile 299): Nach Backend-Response Vorschläge filtern — Vorschläge deren `ingredient_id` in `editItems` (aktiv oder `isDeleted`) vorkommt, entfernen
- [x] 6.2 CSRF-Token in `handleAiSuggest` Fetch einbauen: `headers: { 'X-CSRFToken': getCsrfToken() }`
- [x] 6.3 CSRF-Token in `handleApplyAiSuggestions` Fetch einbauen: `headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }`
- [x] 6.4 In `handleApplyAiSuggestions`: Toast-Hinweis anpassen, falls die Anzahl erstellter Items (aus Response) < ausgewählter Anzahl — "X von Y hinzugefügt – Duplikate übersprungen"

## 7. Frontend: InlineIngredientEditor — Estimate-Apply-Skalierung

- [x] 7.1 In `handleApplyEstimate` (Zeile 278): Display-`quantity` berechnen als `estimate.quantity_per_portion * (servings ?? 1)` statt direkt `estimate.quantity_per_portion`
- [x] 7.2 Zusätzlich `portion_id` aus `estimate.portion_id` setzen (falls vorhanden) — via bestehender `handlePortionChange`-Logik oder direkt im State-Update. `isDirty: true` markieren.

## 8. Frontend: CreateRecipePage — Add-Field UX & Duplikat-Prüfung

- [x] 8.1 In `frontend-food/src/pages/recipes/CreateRecipePage.tsx` (Zeile 551–558): `IngredientAutocomplete` in denselben Card-Container einbetten (Plus-Icon + Label "Zutat hinzufügen")
- [x] 8.2 In `addIngredient` (Zeile 213): Bevor neues Entry eingefügt wird, prüfen ob `selected.id` bereits in `ingredients` als `ingredient_id` existiert. Falls ja: Toast "Zutat bereits vorhanden" (info), `setNewIngredientSearch('')`, return.

## 9. Frontend: Typecheck & Lint

- [x] 9.1 `npm run typecheck` in `frontend-food/` — muss ohne Fehler durchlaufen
- [x] 9.2 `npm run lint` in `frontend-food/` — muss ohne Fehler durchlaufen

## 10. Backend: Tests & Lint

- [x] 10.1 `uv run pytest backend/recipe/tests/` — neue und bestehende Tests müssen grün sein
- [x] 10.2 `uv run ruff check backend/recipe/` — muss ohne Fehler durchlaufen
