## 1. Backend: Notiz und Einheitenwechsel

- [x] 1.1 `MealItem.note` (CharField 500, blank) in `backend/planner/models/meal_plan.py` ergänzen und Migration erzeugen
- [x] 1.2 `MealItemOut`, `MealItemCreateIn`, `MealItemUpdateIn` um `note` erweitern; `MealItemUpdateIn` zusätzlich um `portion_id` und `measuring_unit_id`; Add-Endpunkte speichern `note`
- [x] 1.3 Update-Endpoint: Zutat-only-Prüfung, `_resolve_chosen_portion` und `_require_defined_unit` wiederverwenden, 422 bei fremder Portion, undefinierter Einheit, Rezept-Eintrag
- [x] 1.4 Umrechnung bei reinem Einheitenwechsel mit gleicher `quantity_g` (Gramm, Milliliter, Portion); 422 bei Zielportion ohne Gewicht; gesendete `quantity` unterdrückt die Umrechnung
- [x] 1.5 Notiz im PDF-Export des Essensplans ausgeben
- [x] 1.6 Backend-Tests: Wechsel EL→Gramm und zurück, gleiche Energie, 422-Fälle, gleichzeitige Menge, Notiz setzen/löschen/zu lang, Notiz im PDF

## 2. Frontend: Schemas und API

- [x] 2.1 `schemas/mealPlan.ts`: `note` in MealItem-Schema und Create/Update-Payloads ergänzen; Zod-Vertragstest (`mealPlan.contract.test.ts`) anpassen
- [x] 2.2 `useUpdateMealItem` in `api/mealPlans.ts` um `portion_id`, `measuring_unit_id`, `note` erweitern (optimistisches Update)
- [x] 2.3 Hinzufügen-Pfad (`handleAddIngredient`, `onSelectIngredient`) um `note` erweitern

## 3. Frontend: Gemeinsamer Formatter

- [x] 3.1 Formatter für Plan-Einträge in `lib/ingredientAmount.ts` ergänzen (Portionsanzahl vs. direkte Metrikmenge, Gewichtszusatz)
- [x] 3.2 `formatItemPortion` (`utils/formatItemDisplay.ts`), `MealSlot.formatPortion` und die Inline-Anzeige in `RefMealEditorPage.tsx` darauf umstellen
- [x] 3.3 Tests: „0,5 EL (7,5 g)" statt „0,5 Gramm (15g)", „150 g", Rezept und Plan zeigen dasselbe, Referenz-Mahlzeit

## 4. Frontend: Zeile mit Einheit und Notiz

- [x] 4.1 Plan-Zeile (`MealSlot.tsx`, `TableView.tsx`): Menge plus `PortionPicker` für Einzelzutaten mit Bearbeitungsrecht; Portionen der Zutat gecacht nachladen
- [x] 4.2 Einheitenwechsel sendet nur die neue Einheit (Backend rechnet um), Mengeneingabe sendet Menge plus Einheit
- [x] 4.3 Notiz in der Zeile anzeigen und bearbeiten (Rohtext erhalten, Speichern beim Verlassen)
- [x] 4.4 Hinzufügen-Dialog (`MealOmnibarDialog`, `IngredientQuantityDialog`): Einheit wählbar, optionales Notiz-Feld
- [x] 4.5 Schreibgeschützte und synchronisierte Mahlzeiten zeigen Menge und Notiz als Text
- [x] 4.6 Komponententests: Einheit wechseln, Menge in gewählter Einheit, Notiz speichern, Layout ab 320 px ohne Überlauf

## 5. Abschluss

- [x] 5.1 Backend-Tests und Frontend-Tests (`uv run pytest backend/planner`, Vitest in `frontend-food`) sowie Typecheck/Lint ausführen
- [x] 5.2 Im Browser prüfen: Screenshot-Fall (Frischkäse, 0,5 EL) in Slot- und Tabellenansicht
- [x] 5.3 Prod-Schritte im gesammelten Rollout-Plan vermerken (Migration, nur Dry-Run bis Freigabe)
