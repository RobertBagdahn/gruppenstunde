## 1. P1 Backend: Mengen-Umrechnung und Zutatenprüfung

- [x] 1.1 `recipe/services/unit_gram_conversion.py`: Masse (g, kg) ohne Dichte, Volumen (ml, l, liter) mit Dichte (D3)
- [x] 1.2 Tests `recipe/tests/test_unit_gram_conversion.py`: 250 g bei Dichte 0,6 → 250 g; 1 kg → 1000 g; ml und l weiter mit Dichte
- [x] 1.3 `recipe/services/ingredient_review_service.py`: Zeile mit Zutat ohne Menge → `status="unresolved"`, Grund „Menge fehlt – bitte Menge und Portion festlegen.“
- [x] 1.4 `ingredient_review_service.py`: Gruppierung nur über verschiedene Quellen, höchstens eine Zeile je Quelle pro Gruppe (D8)
- [x] 1.5 `ingredient_review_service.py`: `ReviewPortionOut.name` = Klartextname der Portion statt `str(portion)`
- [x] 1.6 Tests: fehlende Menge → unresolved; zweimal „Mehl“ in einer Quelle → zwei Zeilen; zwei Quellen → eine Zeile mit Konflikt; Portionsname ohne „/“

## 2. P1 Backend: MealItem-Portion (Model, Migration, API)

- [x] 2.1 `planner/models/meal_plan.py`: `MealItem.portion` (FK `supply.Portion`, `null=True`, `SET_NULL`, `related_name="meal_items"`)
- [x] 2.2 Migration erzeugen (`uv run python manage.py makemigrations planner`) und `makemigrations --check` grün
- [x] 2.3 `planner/services/meal_item_helpers._resolve_ingredient_weight_g`: `item.portion` mit vertrauenswürdigem Gewicht zuerst; Portions-Cache um Portion-ID erweitern
- [x] 2.4 `planner/schemas/meal_plan.py`: `MealItemOut.resolve_quantity_g` über den Helper; neue Felder `portion_id`, `portion_name`; `MealItemCreateIn` und `MealItemUpdateIn` mit `portion_id`
- [x] 2.5 `planner/api/meal_plan.py` Item anlegen/ändern: Portion gehört zur Zutat und ist aktiv, sonst HTTP 422; `measuring_unit` aus der Portion übernehmen
- [x] 2.6 Tests: Toastbrot 1 × Scheibe → `quantity_g=30`, kcal aus 30 g, Einkaufsliste 396 g; fremde Portion → 422; anonym → 401/403; Altbestand ohne Portion unverändert

## 3. P1 Backend: Einkaufslisten und stabile Listen

- [x] 3.1 `shopping/schemas.py._display_quantity` (beide Schemas): mit Zutat immer `shopping_quantity(quantity_g, ingredient)` (D5)
- [x] 3.2 `shopping/api.py create_from_meal_plan`: `unit="g"` speichern
- [x] 3.3 `shopping/api.py list_shopping_lists`: `sort` (`newest`/`oldest`/`name_asc`) mit `id`-Tie-Breaker und `mine`
- [x] 3.4 `recipe/api/recipes.py list_recipes`: `-id` als letzter Schlüssel für alle Sortierungen; `random` mit `seed` (MD5) und `seed` in der Antwort; `RecipeFilterIn` und Paginierungs-Schema erweitern
- [x] 3.5 `planner/api/meal_plan.py list_meal_plans` und `supply/api/ingredients.py list_ingredients`: `id`-Tie-Breaker
- [x] 3.6 Tests: Honig 273 g/Dichte 1,4 → 195 ml in erzeugter Liste; alle Seiten ohne Dublette (Rezepte `most_liked`, `popular`, `random` mit Seed; Einkaufslisten); `mine`; anonym → 401

## 4. P1 Frontend: Schemas und API-Hooks

- [x] 4.1 `schemas/mealPlan.ts`: MealItem `portion_id`, `portion_name`; Create-/Update-Payload `portion_id`
- [x] 4.2 `api/shoppingLists.ts` `useShoppingLists`: `sort`, `mine` senden, Query-Key erweitern
- [x] 4.3 Rezeptliste: `seed` in `RecipeListStateSchema` und `buildFilterParams`; bei Wahl von „Zufällig“ neuen Seed erzeugen; Zod-Paginierungsschema um `seed`

## 5. P1 Frontend: Rezept-Editor und Mengen-Dialog

- [x] 5.1 `InlineIngredientEditor.tsx` `handleAddFromDialog` und `handleSelectAlternative`: keine `scaleQuantity`-Multiplikation der Dialogmenge (D1)
- [x] 5.2 `InlineIngredientEditor.tsx`: kein stiller Rang-1-Fallback bei gesetzter, aber unbekannter `portionId` (Fehler-Toast)
- [x] 5.3 `IngredientQuantityDialog.tsx`: „Gramm“ wählt die Gramm-Portion, ohne Gramm-Portion ausgeblendet; `onConfirm` nie mit `null`
- [x] 5.4 Tests: Kontext 4 + Dialog 2 × 100 g → Zeile 2 (200 g); Gramm 250 → 250 × „g“; Zutat ohne Gramm-Portion → Option deaktiviert

## 6. P1 Frontend: Zutatenprüfung

- [x] 6.1 Store: `removeRow`, `restoreRow` (Undo), `updateRow` überschreibt einen expliziten Status nicht
- [x] 6.2 `RecipeIngredientReviewStep.tsx`: Knopf „Entfernen“ mit Undo-Toast, Bestätigung bei der letzten Zeile
- [x] 6.3 Unvollständige Zeile: „Menge fehlt“ in Warnfarbe, Primäraktion „Menge festlegen“ öffnet den Mengen-Dialog
- [x] 6.4 Mengenspalte: „2,4 × Tasse Mehl (à 100 g)“ mit `formatNumber`/`formatExactWeight`
- [x] 6.5 Tests (Store und Komponente): entfernen, rückgängig, letzte Zeile, Menge festlegen, Finalisieren ohne entfernte Zeilen

## 7. P1 Frontend: Wochenplan-Suche

- [x] 7.1 `MealOmnibarDialog.tsx`: globalen `keydown`-Listener entfernen; Kopf „Hinzufügen zu: …“ (neue Prop `targetLabel`); Filter beim Öffnen auf „Alle“; Sets und Bundles entfernt; „Alle“ gruppiert (5 + 5)
- [x] 7.2 `MealSlot.tsx` und `DayPlanView.tsx`: Slots melden `onActivate(meal.id)`, Dialog-Titel nennt das Ziel; Slot-Dialoge bleiben für den Klick
- [x] 7.3 `MealEventDetailPage.tsx`: `lastActiveMealId`, Hook `useOmnibarShortcut` (nur bei `can_edit`), `handleAddIngredient` sendet `portion_id`
- [x] 7.4 `utils/formatItemDisplay.ts` `formatItemPortion`: Portion mit Gewicht („1 Scheibe / P. (30 g)“)
- [x] 7.5 Tests: Cmd+K bei 7 Slots → genau ein Dialog; Ziel ist der zuletzt aktive Slot; Viewer → kein Dialog; Zutat sendet `portion_id`

## 8. P1 Frontend: Einkaufslisten-Übersicht

- [x] 8.1 `ShoppingListPage.tsx`: clientseitiges Sortieren und Filtern entfernen, `sort`/`mine` an den Hook
- [x] 8.2 Tests: neue Liste steht oben; „Meine Daten“ zeigt die gefilterte Gesamtzahl

## 9. P1 Prüfung

- [x] 9.1 `uv run python manage.py makemigrations --check` und `uv run pytest` (betroffene Apps, dann vollständig)
- [x] 9.2 `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` in `frontend-food`
- [x] 9.3 Browser-Nachtest der P1-Fälle aus dem Audit (Detailsuche ×4, Gramm 250, Cmd+K, Toastbrot, Honig, Blättern Rezepte/Einkaufslisten, Zutatenprüfung)
- [x] 9.4 Runbook: Migration `MealItem.portion` und Prüfliste Einzelzutaten „Gramm, Menge ≤ 5“ für Prod

## 10. P2: Anzeigen und tote Bedienelemente

- [x] 10.1 Zutatenprüfung: „Zutat ändern“ fokussiert die Suche; „Zutat hinzufügen“ fügt eine leere Zeile hinzu; Tippen ohne Auswahl leert die ID; Abbrechen behält die Portion; Dialog startet mit den aktuellen Werten; „Keine passende Zutat“ erzeugt einen Entwurf statt einer Sackgasse
- [x] 10.2 Klartext-Portionsnamen statt `str(portion)`: `recipe/schemas/items.py:84`, `recipe/api/nutrition.py:186`, `content/services/ai_supply_service.py:284`, `recipe/services/ai_ingredients_service.py:385`; `InlineIngredientEditor.tsx:376`
- [x] 10.3 Zutatenliste: Backend `sort` (`newest`, `oldest`, `name_asc`, `name_desc`) und `origin=mine`; Tests
- [x] 10.4 `usePersistedListState.patch` als Funktionsupdate; Kostenfilter mit Min und Max in einem Aufruf; Test für „2 – 5€“
- [x] 10.5 Kostenfilter und Tabelle auf Portionspreis (`cached_price_total / portions`, im Backend annotiert); Beschriftung „pro Portion“
- [x] 10.6 `RecipeHistogram.tsx`: Zahlen nicht über `Number(formatNumber())` (NaN)
- [x] 10.7 `NutritionTab.tsx`: „Gesamtnährwerte“ mit Gesamtwerten oder Umbenennen auf „pro 100 g“, DGE-Abdeckung auf derselben Basis
- [x] 10.8 `CopyFromPlanDialog.tsx`: Datum aus ISO-Zeitstempel formatieren (der aktuelle Plan bleibt als Quelle wählbar, Kopieren innerhalb eines Plans ist gewollt)
- [x] 10.9 Kochplan: Tages-Zeitspanne in Ortszeit, Reihenfolge nach Startzeit; Tage nach lokalem Datum gruppieren (`slice(0, 10)` ersetzen)
- [x] 10.10 Einkaufsliste: Stückzahl und Portionsname strukturiert („≈ 52 × mittelgroße Kartoffel“), Stückzahlen aufrunden, eigene Überschrift „Sonstiges“
- [x] 10.11 Wochenplan-Suche: Übernehmen-Knopf mobil erreichbar (Sets/Bundles und Gruppierung „Alle“ sind in Gruppe 7 erledigt)
- [x] 10.12 Plan-Assistent: 0 Personen und Ende vor Start blockieren, Schrittzähler; Backend `norm_portions > 0` (Pydantic `Field(gt=0)`) mit Test
- [x] 10.13 Plan-Check: Datum und Beträge im deutschen Format (eine zusätzliche Energie-Regel entfällt: die Soll/Ist-Anzeige im Plan deckt das ab)

## 11. P3: Format, Layout, Barrierefreiheit

- [x] 11.1 Deutsche Zahlen: Protein-Karten, `MacroBar`, Histogramm-Achsen, PAL-Optionen, Mengenfelder im Editor, `RecipeSearchDialog.tsx:588`, `useRecipeModificationStore.ts`
- [x] 11.2 320 px: Preise im Einkaufen-Tab, „Portion hinzufügen“ und Badges auf der Zutatenseite, „Bereits vorhanden“, Schritte-Hinweis, Kopfzeilen-Icon, Kochen-Reiter
- [x] 11.3 `aria-label` für das ⋮-Menü (die Filter-Checkboxen sind bereits über ihr umschließendes `<label>` benannt; der frühere Befund war ein Werkzeug-Artefakt)
- [x] 11.4 Tag-Badges in Mahlzeiten: Buffet-Rollen entfallen als Badge (stehen als Gruppen), andere Slugs über `tagDisplayName` lesbar (Schema unverändert, Slugs sind Logik-Schlüssel)
- [x] 11.5 Leere Filterergebnisse: „Keine Treffer“ mit „Filter zurücksetzen“; Soll/Ist-Reihenfolge in Tagesplan und Tabelle einheitlich; Tausenderpunkt in der Tagesbilanz
