## 1. Phase 1 – Backend: Mengenmodell und Gramm-Berechnung

- [x] 1.1 `supply/services/quantity_units.py`: `standard_measure_grams` (aus `list_standard_measures` extrahiert), `resolve_grams`, `unit_options`, `format_amount`; API `standard-measures` darauf umstellen
- [x] 1.2 Fixture-Satz `backend/supply/tests/fixtures/quantity_format_cases.json` + Backend-Tests (Screenshot-Fall, EL mit und ohne Dichte, Prise, ml, Gewicht fehlt)
- [x] 1.3 `MealItem.standard_measure_key` + Migration (Bestandsdaten: `measuring_unit` bei Portion leeren)
- [x] 1.4 Management Command `normalize_meal_item_units` (Dry-Run als Default, Bericht, `--apply`) laut design.md
- [x] 1.5 CheckConstraints und Service-Validierung für `MealItem` (genau eine Einheitenart; Altlast-Maßeinheiten werden auf Standardmaß bzw. Portion abgebildet)
- [x] 1.6 `_resolve_ingredient_weight_g` an `resolve_grams` delegieren; Plausibilität, Einkaufsliste, Kochplan und PDF nutzen Portion/Standardmaß (Nachtrag WP-02: auch `recipe/services/nutrition_aggregation.py` für Vorschläge und Ampel; Tests in `test_quantity_integrity_regressions.py`)

## 2. Phase 1 – Backend: API

- [x] 2.1 `planner/api/meal_plan.py`: Hinzufügen mit Portion setzt keine `measuring_unit`; `standard_measure_key` annehmen; `_require_defined_unit` entfernen
- [x] 2.2 `MealItemOut`: `unit_kind`, `unit_label`, `standard_measure_key`, `is_weight_approx`; `MealItemUpdateIn` mit flachen Feldern `portion_id`, `measuring_unit_id`, `standard_measure_key` (design.md §4, kein verschachteltes `unit`); `RefMealItemIn/Out` + Sync
- [x] 2.3 Suche liefert `start_portion_id`; Kopieren/Synchronisieren übernimmt Portion und Standardmaß
- [x] 2.4 `GET /api/ingredients/unit-options/?ids=` (max. 200, `food_access`)
- [x] 2.5 `pdf_export.py` auf `format_amount` (Portions-Einträge seit WP-02 ebenfalls, z. B. „5 EL (150 g)“)
- [x] 2.6 Tests: Einheitenwechsel, 422 bei Widerspruch und unbekanntem Schlüssel, 401/403, Portionskorrektur wirkt auf Einträge, RefMeal-Sync
- [x] 2.7 Testlücken: 401/403-Tests in `test_meal_item_units.py` senden das nicht existierende Feld `unit` statt `standard_measure_key`/`portion_id`; RefMeal-Sync mit Portion und Standardmaß; Einheitenoptionen ohne Anmeldung

## 3. Phase 1 – Frontend: Bausteine und Essensplan

- [x] 3.1 Zod `schemas/quantityUnits.ts`, `mealPlan.ts`, `recipe.ts` synchron; Contract-Tests
- [x] 3.2 `lib/quantityUnits.ts` (`toCount`, `toGrams`, `formatAmount`) mit den gemeinsamen Fixtures
- [x] 3.3 `useUnitOptions(ids)` (gebündelt), `useUnitViewMode()` (`?units=grams`)
- [x] 3.4 `components/quantity/UnitPicker.tsx`: kompakter Einheiten-Umschalter mit vollem Optionskatalog und Gramm je Option, „Gewicht fehlt“ markiert (Rezept-Editor stellt in Phase 2 von `PortionPicker` um)
- [x] 3.5 Anzeige- und Eingabe-Komponenten mit Live-Vorschau „= … g“ (320 px), umgesetzt gemeinsam in `components/quantity/QuantityUnit.tsx`
- [x] 3.6 `MealSlot.tsx` (Karte + Buffet-Rollenliste), `TableView.tsx`, `DayPlanView.tsx`, `RefMealEditorPage.tsx` umstellen; alte Formatierer und `QuantityInput.tsx` entfernen
- [x] 3.7 `MealOmnibarDialog.tsx`: Startauswahl Standardportion × 1 bzw. 100 g, Einheit änderbar
- [x] 3.8 Seitenmodus „Alles in Gramm“ auf Essensplan- und RefMeal-Seiten
- [x] 3.10 Aktion „Gewicht ergänzen“ navigiert mit `?editPortion=<id>` direkt zum bestehenden Portionen-Editor der Zutat
- [x] 3.9 Tests: Screenshot-Fall überall „0,5 Portion (15 g)“; Ansicht umschalten ohne Request; Eingabe „2 Stück“ speichert Portion + 2; Prise; Gramm immer sichtbar; Lesemodus
- [x] 3.11 Einheitenwechsel mit konstantem Gewicht in Essensplan-Einträgen (MealSlot, Tages- und Tabellenansicht): Wechsel ohne neue Menge sofort speichern (PATCH nur mit Einheit, Backend rechnet über `resolve_grams` um), `MealItem.quantity` mit drei Nachkommastellen (Migration), Hinweis „Einheit geändert“ mit „Rückgängig“, Lesemodus unverändert; Backend-Tests (55 g → 0,55 Stück, 3 EL → 42,75 g, Portion → EL → g, Rundung, fehlendes Gewicht, 403) und Frontend-Tests (Sofortspeichern, Rückgängig, Fehler, Einheit ohne Gewicht, Lesemodus)

## 4. Phase 2 – Rezept-Editor und Anzeige

- [x] 4.0a Gramm-Modell für `RecipeItem` mit der archivierten Capability `direct-gram-recipe-items` abgleichen (dort: Gramm = `portion=NULL` + `ingredient`; hier verwendet „g“-Basisportion); Architekturentscheidung und Specs vor Archivierung angleichen
- [x] 4.0 `RecipeItem.standard_measure_key` + Migration + Constraint (Standardmaß an der „g“-Basisportion); `RecipeItemIn/Out` mit `standard_measure_key`, `unit_kind`, `unit_label`, `is_weight_approx`; Rezept-Gewichtsauflösung an `resolve_grams` delegieren
- [x] 4.1 `InlineIngredientEditor.tsx`, `IngredientQuantityDialog.tsx`: Standardmaß bleibt Einheit (`PortionPicker` mit `selectedStandardKey`, mengenerhaltender Wechsel)
- [ ] 4.1a Rezept-Editor auf `QuantityUnitInput` umstellen (zurückgestellt: `PortionPicker` + Live-Gewicht leisten dasselbe, der 2000-Zeilen-Editor arbeitet mit einem Entwurfs-Zustand statt Sofort-PATCH; Umbau brächte keine Verhaltensänderung bei hohem Regressionsrisiko)
- [ ] 4.2 (zurückgestellt: `IngredientList` hat bereits den `UnitSwitcher`, Einheit zuerst und Gramm sichtbar; `formatAmount`-Umbau würde die bestehenden Specs `recipe-ingredient-display` und deren Tests umschreiben) `RecipeIngredientsTable.tsx`, `components/supply/IngredientList.tsx`, `IngredientDetailPage` auf `formatAmount` + Umschalter
- [x] 4.3 Tests Rezept-Editor (EL bleibt EL, Gramm-Erhalt beim Wechsel) und Detailseite

## 5. Phase 3 – Buffet- und Frühstücks-Wizard


- [x] 5.1 `Meal.buffet_role_amounts` hält neu `{amount, unit, amount_g}`; alte Zahlenwerte werden beim Lesen als Gramm/ml gelesen (`_saved_role_amounts`), deshalb keine Datenmigration nötig
- [x] 5.2 `buffet_service`/`buffet_units`: `role_unit_options` (gemeinsame natürliche Einheiten der Rolle), Speicherung mit Item-Einheit (Portion/Standardmaß, z. B. 0,75 Stück), Shares nach Gramm aus der Rolleneingabe
- [x] 5.3 `BuffetSaveIn.role_units`, `BuffetResultOut.role_amounts/role_unit_options`, `BuffetStateOut.role_units` und Zod `schemas/buffet.ts` synchron
- [x] 5.4 `BuffetBuilder.tsx`: Rollenmenge mit Einheiten-Umschalter („g/P.“ oder „Stück/P.“), Rückfall auf Gramm mit Hinweis (`unit_fallback`), Wiederherstellung der Einheit. Item-Mengen bleiben Anteile in %.
- [ ] 5.5 `pages/planning/breakfast/*`: Zurückgestellt. Der Frühstücks-Wizard rechnet mit eigenen Profilen und Gramm; `formatGramsWithPortionHint` bleibt, bis dieser Wizard auf `role_units` umgestellt wird.
- [x] 5.6 Tests: „2 Stück/Person“ mit 60 g und 80 g → 140 g, Speicherung als Portion mit Stückzahl und gleicher Wiederherstellung, Rückfall auf Gramm, Altwerte, API-Roundtrip (`test_buffet_service.py`, `test_buffet_api.py`, `BuffetBuilder.test.tsx`); 401/403 unverändert getestet

## 6. Phase 4 – Einkaufslisten


- [x] 6.1 `shopping_service`: `start_unit` (gemeinsame natürliche Quell-Einheit → Standardportion → g/ml) und `ingredient_id`; `piece_equivalent` entfernt (`start_unit_for`, `_contribution_unit_key`)
- [x] 6.2 `ShoppingListItemOut.start_unit` (Plan-Ansicht und gespeicherte Liste); `display_text` im Mengen-Überblick; Zod `shoppingList.ts` und `mealPlan.ts`. Das WebSocket-Payload enthält keine Einheiten und bleibt unverändert.
- [x] 6.3 `ShoppingListItemRow`, `ShoppingView`: Startansicht „24 Stück (1,4 kg)“, Umschalter (`QuantityUnitLabel`), Mengeneingabe in jeder Einheit → `quantity_g` (`QuantityUnitInput`, Stift-Button)
- [x] 6.4 Tests: „24 Stück (1,4 kg)“, gemischte Quellen (`test_shopping_start_unit.py`), Eingabe „30 Stück“ → 1800 g, Berechtigung ohne Bearbeitungsrecht; REWE-Export unverändert (Tests grün)

## 7. Abschluss

- [x] 7.1 `uv run pytest` (planner, recipe, supply, shopping), `uv run ruff check`, Frontend-Typecheck, Lint, Tests
- [ ] 7.2 Dry-Run `normalize_meal_item_units` auf einer Prod-Kopie, Bericht prüfen, Okay einholen
- [x] 7.3 `unified-buffet-wizard` ist archiviert; Phase 3 ist damit mergbar Phase 3 erst nach Archivierung von `unified-buffet-wizard` mergen
- [ ] 7.4 Manuell mit Peters Fall: Brötchen in Stück, Frischkäse in EL, Salz in Prise, „Brot: 2 Stück/Person“, Einkaufsliste, PDF; 320 px

## 8. Nachtrag aus `recipe-to-meal-plan`

- [x] 8.1 Mengenpille: Ist der Portionsname eine Volumen-/Masseneinheit, zeigt sie „(≈ 1.020 g)“ statt „à 980 ml“ (`formatPortionReference`).
- [x] 8.2 Management-Command `report_volume_portion_density` (nur Report) für Volumen-Portionen mit abweichender Dichte; Korrekturen nur nach OK im Prod-Rollout.
