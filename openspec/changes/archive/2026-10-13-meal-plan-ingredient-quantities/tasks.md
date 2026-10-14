## 0. Diagnose Peters Fall

- [x] 0.1 Peters Plan und Sandwich-Rezept identifizieren; Zwiebel/Salat-Mengen prüfen und Ergebnis im Change notieren (`diagnosis-bundesrat-2026.md`)

## 1. Backend: gemeinsame Berechnung

- [x] 1.1 `collect_ingredient_contributions(meal_plan)` aus `supply/services/shopping_service.py` herauslösen (Beitrag je MealItem × RecipeItem mit Netto-/Reserve-Gramm, Rohmenge, Rechenbestandteilen, IDs)
- [x] 1.2 `generate_shopping_list` auf den Sammler umstellen; bestehende Einkaufslisten-Tests bleiben grün
- [x] 1.3 Anpassbarkeit je Beitrag bestimmen (`is_synced`, `is_external`, optional, Austauschgruppe, direkte Zutat) mit deutschem Grund

## 2. Backend: Schemas und API

- [x] 2.1 Pydantic: `IngredientQuantityOut`, `IngredientQuantityLineOut`, `IngredientQuantityAdjustIn` (Validierung je Modus, Grenzen für `percent`, `target_total_g > 0`), `IngredientQuantityAdjustOut`, `MealItemOverrideLineIn`; Re-Export in `planner/schemas/__init__.py`
- [x] 2.2 Service `planner/services/ingredient_quantities.py`: Übersicht und anteilige Verteilung (Originalmengen als Basis, fixer Anteil, Rundung, 422-Fälle)
- [x] 2.3 `GET /api/meal-plans/{id}/ingredient-quantities/` (Zugriff wie Einkaufsliste, Prefetch ohne N+1)
- [x] 2.4 `POST /api/meal-plans/{id}/ingredient-quantities/{ingredient_id}/adjust/` atomar mit `update_or_create`
- [x] 2.5 `PUT`/`DELETE /api/meal-plans/{id}/meal-items/{item_id}/overrides/{recipe_item_id}/` (Upsert/Reset einer Zeile; synced/extern → 422)
- [x] 2.6 Override-Kennzeichen im Zeitplan (`cooking_schedule_service`: `is_overridden` je Zutat); MealSlot nutzt vorhandenes `MealItemOut.overrides`
- [x] 2.7 Migration `0017_meal_item_override_precision` (`quantity_override` mit vier Nachkommastellen)

## 3. Backend: Tests

- [x] 3.1 Summengleichheit Übersicht ↔ Einkaufsliste (Reserve, `override_portions`, Faktor, Override, Ausschluss, Variante, Zutat ohne Gewicht)
- [x] 3.2 Zielmenge, fixer Anteil, Prozent, Reset, Idempotenz, Ziel ≤ fix → 422, keine anpassbaren Zeilen → 422
- [x] 3.3 Einzelzeilen-Upsert lässt andere Overrides stehen; synced/extern/optional/Austausch abgelehnt
- [x] 3.4 Rechte: 401 ohne Login, 403 ohne Bearbeitungsrecht, Lesezugriff für Mitleser
- [x] 3.5 `uv run pytest` für `planner`, `supply`, `shopping`

## 4. Frontend-Food: Schemas und Hooks

- [x] 4.1 Zod-Schemas in `src/schemas/mealPlan.ts` synchron zu 2.1 (inkl. `has_overrides`, Zeitplan-`is_overridden`)
- [x] 4.2 Hooks `useIngredientQuantities`, `useAdjustIngredientQuantity`, `useSetMealItemOverride`, `useResetMealItemOverride` in `src/api/mealPlans.ts` mit Invalidierung von Plan, Mengen, Einkaufsliste, Kosten, Nährwerten, Zeitplan

## 5. Frontend-Food: UI

- [x] 5.1 `IngredientQuantitiesView.tsx` (CardTable/DataCardRow, QuerySection, Skeleton, Suche und „nur angepasste“ im URL-State)
- [x] 5.2 Aufklappbare Beiträge mit Inline-Mengenfeld, Ausschließen, Zurücksetzen, deaktivierten Zeilen mit Grund
- [x] 5.3 Dialog „Gesamtmenge anpassen“ (Einheit aus `portion_options` + g, Prozent, Vorschau, Zurücksetzen); Toast mit Rückgängig
- [x] 5.4 Unterreiter „Mengen“ in `MealEventDetailPage.tsx` (`?sub=quantities`)
- [x] 5.5 Badge „angepasst“ in `MealSlot.tsx` und `CookingScheduleTab.tsx`
- [x] 5.6 Vitest: Zod-Parsing, Dialog-Umrechnung, Inline-Bearbeitung, Read-only, Grund bei nicht anpassbaren Zeilen
- [x] 5.7 Mobile-Check bei 320 px (Playwright gegen lokales Backend): kein horizontaler Überlauf; Dialog-Breite, Titel/Schließen-Button und Portionshinweise korrigiert; Speichern, Rückgängig, Inline-Bearbeitung und Zurücksetzen im Browser geprüft
- [x] 5.8 Optimistisches Update für Einzelzeilen und Cache-Update nach planweiter Anpassung; `portion__measuring_unit` und Abteilungen vorgeladen (Mengenansicht 239 → 109 Queries, Einkaufsliste 157 → 107)

## 6. Abschluss

- [x] 6.1 `npm run lint`, `npm run typecheck`, `npm test` in `frontend-food/`
- [x] 6.2 Prüfung mit Peters Plan auf Prod (nur lesend, nach Deploy): 56 Zutaten, Summen identisch mit der Einkaufsliste, Zwiebel/Eisbergsalat-Anteile wie in der Diagnose
- [x] 6.3 Rückmeldung an Peter
- [x] 6.4 Datenkorrektur Zwiebel/Eisbergsalat auf Prod (Freigabe 12.10.2026, Snapshot `1791780970242`)
