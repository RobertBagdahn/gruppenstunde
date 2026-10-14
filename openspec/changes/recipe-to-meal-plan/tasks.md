## 1. Review-Dialog „Menge und Portion“

- [x] 1.1 Backend: `selected_ingredient_slug` in `ingredient_review_service.py` und `recipe/api/items.py` setzen (Test `test_ingredient_review_quantities.py`)
- [x] 1.2 Frontend: `UnknownIngredientDialog` reicht Slug an `IngredientAutocomplete` durch
- [x] 1.3 `RecipeIngredientReviewStep`: Dialog mit Skeleton während des Ladens und `ErrorDisplay` mit „Erneut versuchen“ bei Fehler
- [x] 1.4 Fehlt der Slug trotz Backend-Garantie, zeigt der Dialog eine Fehlermeldung statt stumm zu bleiben
- [x] 1.5 Frontend-Test: Button öffnet Dialog bei KI-Zeile (Slug vorhanden) und zeigt Fehlerzustand
- [x] 1.6 Alle Zutaten-Dialoge im Wizard prüfen (`InlineIngredientEditor`, `WizardStepIngredients`, `RecipeMaterialsEditor`) und Funde beheben

## 2. Gemeinsame Zutatensuche (Backend)

- [x] 2.1 `supply/services/ingredient_search.py` mit Teilstring, Aliasen, Umlautvarianten, Ranking und Entwurfsoption
- [x] 2.2 `supply/api/ingredients.py` (`name=`) auf gemeinsame Suche umstellen
- [x] 2.3 `_meal_plan_ingredient_search_queryset` auf gemeinsame Suche umstellen; `VERIFIED` plus eigene Entwürfe
- [x] 2.4 `buffet_catalog.search_buffet_items`: Standalone-Filter entfernen, Relevanzgruppe 4, Feld `is_cooking_ingredient`; `include_non_standalone` ignorieren
- [x] 2.5 Pydantic-Schemas anpassen (Buffet-Suchitem, Omnibar-Zutat `status`)
- [x] 2.6 Backend-Tests: Zwiebel → Speisezwiebel in allen drei Suchen, Ranking, Entwürfe nur für Besitzer

## 3. Gemeinsame Zutatensuche (Frontend)

- [x] 3.1 Zod: `BuffetCatalogSearchItemSchema` um `is_cooking_ingredient`; `useBuffetCatalogSearch` sendet `include_non_standalone` nicht mehr
- [x] 3.2 `BuffetBuilder`: Checkbox „Auch Backzutaten & Gewürze“ entfernen, Badge „Zutat zum Kochen“
- [x] 3.3 `MealOmnibarDialog`: Badge „Entwurf“, `ALL_GROUP_LIMIT` auf 8
- [x] 3.4 Frontend-Tests anpassen (`BuffetBuilder.test.tsx`, `MealOmnibarDialog.test.tsx`)

## 4. Rezeptvorschau im Suchdialog

- [x] 4.1 Backend: `GET /api/recipes/{id}/preview/?portions=N` (volle Beschreibung, Zutaten mit Mengen, Allergene, Tags) samt Pydantic-Schema
- [x] 4.2 Backend: Beschreibung in der Suchantwort nicht mehr auf 200 Zeichen kürzen
- [x] 4.3 Zod-Schema und TanStack-Query-Hook `useRecipePreview`
- [x] 4.4 Gemeinsame Vorschau-Komponente (Desktop-Spalte und Bottom-Sheet `RecipePreviewSheet`)
- [x] 4.5 „Rezept ansehen“ (neuer Tab), ausklappbare Zutatenliste, „Mehr“ bei Beschreibung, Tags und Allergen-Chips
- [x] 4.6 Tests: Vorschau Desktop und 320-px-Sheet, Link öffnet neuen Tab

## 5. Rezept → Essensplan

- [x] 5.1 Backend: doppeltes Rezept pro Mahlzeit wird bereits abgelehnt (`raise_if_duplicate_meal_item`, 422); nichts zu tun
- [x] 5.2 `AddRecipeToMealPlanDialog` (Plan → Tage/Mahlzeiten mit Mehrfachauswahl → Portionen), nur Pläne mit `can_edit`
- [x] 5.3 „Neuen Plan anlegen“ im Dialog über vorhandenen `CreateMealPlanDialog`
- [x] 5.4 Button im Kopfband und in `RecipeMobileActionBar`; anonym → Login mit Rücksprung
- [x] 5.5 Duplikate deaktivieren und erklären; Toast mit „Zum Plan“ und „Rückgängig“
- [x] 5.6 Tests: Mehrfachauswahl, Duplikat, anonym, Rückgängig

## 6. Mengenanzeige und Datenreport

- [x] 6.1 `lib/ingredientAmount.ts`: `formatPortionReference` (Gewicht statt à-ml bei Volumen-/Masseneinheit als Portionsname)
- [x] 6.2 `IngredientList.PortionPill` und `formatRecipeItemAmount` darauf umstellen; Tests ergänzen
- [x] 6.3 Management-Command `report_volume_portion_density` (nur Dry-run) mit Test
- [ ] 6.4 Report gegen Prod-Daten nur lesend ausführen: im Runbook (`docs/prod-runbook.md`, Abschnitt „recipe-to-meal-plan …“) eingetragen; läuft nach dem Deploy mit Roberts Freigabe, Ergebnis dann als A/B/C-Vorschläge an Peter, keine Korrektur ohne OK

## 7. Abschluss

- [x] 7.1 Nachträge in `unified-buffet-wizard` (Punkt 3.2) und `switchable-quantity-units` (Punkt 6) vermerken
- [x] 7.2 `uv run pytest`, `npm run test`, `tsc --noEmit` und Lint ausgeführt (alles grün)
- [x] 7.3 Bei 320 px im Browser geprüft (Essensplan-Dialog, Vorschau-Sheet, Mobile-Leiste, Buffet-Schritt 2 mit Suche); dabei zwei Layoutfehler behoben (Kalender-Icon in der Mobile-Leiste zusammengedrückt, Buffet-Dialog 616 px breit)
