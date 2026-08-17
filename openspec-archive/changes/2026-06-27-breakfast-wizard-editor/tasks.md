## 1. Backend — MealItemOut um ingredient_tags und recipe_type erweitern

- [x] 1.1 `MealItemOut` in `backend/planner/schemas/meal_plan.py`: `ingredient_tags: list[str]` mit Resolver aus `obj.ingredient.nutritional_tags.values_list("slug", flat=True)` hinzufügen
- [x] 1.2 `MealItemOut`: `recipe_type: str = ""` mit Resolver aus `obj.recipe.recipe_type` (falls recipe vorhanden) hinzufügen
- [x] 1.3 Keine Migration nötig (nur Pydantic-Schema-Änderung)
- [x] 1.4 Tests: `MealItemOut` gibt `ingredient_tags` und `recipe_type` korrekt zurück (in `test_create_ref_meal_with_items`)

## 2. Backend — Drink Catalog Endpoint

- [x] 2.1 `DrinkRecipeSchema` in `backend/supply/api/breakfast_catalog.py` definieren: `DrinkRecipeOut` mit `{ id, title, recipe_type, cached_energy_kcal }`
- [x] 2.2 `GET /api/supply/breakfast-catalog/drinks/` Endpoint in `backend/supply/api/breakfast_catalog.py`: filtert Recipes mit `recipe_type="drink"`, gibt Liste von `DrinkRecipeSchema` zurück
- [x] 2.3 Tests: Endpoint gibt Getränke-Rezepte zurück (bereits vorhanden in `TestBreakfastDrinks`)

## 3. Backend — Seed-Daten Getränke-Rezepte

- [x] 3.1 Seed-Script erstellt: `backend/recipe/management/commands/seed_drink_recipes.py` — 4 Rezepte mit `recipe_type="drink"`
- [x] 3.2 Idempotenz via slug-based deduplication
- [x] 3.3 Seed ausgeführt: 4 drink recipes created

## 4. Frontend — Zod-Schemas syncen

- [x] 4.1 `MealItemSchema` in `frontend-food/src/schemas/mealPlan.ts`: `ingredient_tags: z.array(z.string())` und `recipe_type: z.string()` hinzugefügt
- [x] 4.2 `DrinkRecipeSchema` in `frontend-food/src/schemas/breakfast.ts` definiert
- [x] 4.3 `useDrinkRecipes()` Hook in `frontend-food/src/api/breakfast.ts` angelegt
- [x] 4.4 Typ `DrinkRecipe` exportiert

## 5. Frontend — Generischer Display-Fix (alle meal types)

- [x] 5.1 `RefMealEditorPage.tsx`: Anzeige-Logik auf `display_name || recipe_title || ingredient_name || "Unbekannt"` geändert
- [x] 5.2 Prüfen, dass `ingredient_name` für Brot/Belag-Items korrekt angezeigt wird (via ingredient_tags + recipe_type aus API)

## 6. Frontend — Breakfast-Mode in RefMealEditorPage

- [x] 6.1 Kein RefMeal für Breakfast → `<Navigate to="/wizard" />` Redirect
- [x] 6.2 Breakfast-Vorschau mit gruppierten Kategorien via `getItemCategory()` Helper
- [x] 6.3 Pro Kategorie (Brot/Belag/Warm/Extras/Getränke) Items mit Name + Menge + kcal
- [x] 6.4 Energie getrennt: `foodKcal` vs `drinkKcal` über useMemo
- [x] 6.5 "Frühstücksassistent öffnen"-Button im Header
- [x] 6.6 Rezept-Picker, Speichern- und Normalisieren-Buttons für Breakfast ausgeblendet
- [x] 6.7 Sync- und Link-Buttons für Breakfast erhalten
- [x] 6.8 Non-Breakfast-Features unverändert (separater Render-Pfad)

## 7. Frontend — Wizard lädt bestehendes RefMeal

- [x] 7.1 Helper `refMealItemsToWizardState` in `lib/refMealToWizardState.ts`: mappt MealItems (Basis/Belag/Warm/Extras/Drinks) in WizardState
- [x] 7.2 `useWizardState(initialWizardState)` in BreakfastWizardPage mit Catalog + RefMeal-Items
- [x] 7.3 Nicht mappbare Items → `toast.warning()` + überspringen (über mappableCount-Check)
- [x] 7.4 Drink-Items (recipe_type=drink) → mlVerhältnis → coffeePercent/cocoaPercent/teaPercent
- [x] 7.5 Basis-Items (frühstücks-basis Tag) → bePerPerson + sharePercent
- [x] 7.6 Belag-Items (frühstücks-belag Tag) → sharePercent + globalIntensity
- [x] 7.7 Extra-Items (ingredient ohne Tags) → extraIngredients Map
- [x] 7.8 Warme-Gerichte-Items (recipe_id, recipe_type≠drink) → warmDishRecipeIds + Factors

## 8. Frontend — Wizard Abbrechen

- [x] 8.1 ← Pfeil navigiert zu `/meal-plans/${planId}/ref-meals/breakfast` (refMeal-Mode) bzw. Plan-Übersicht (directMeal-Mode)
- [x] 8.2 "Abbrechen"-Button im Footer (nur im Edit-Mode, vor Cockpit)

## 9. Frontend — Wizard speichert Getränke als recipe_id

- [x] 9.1 `buildItems()`: Getränke werden als `recipe_id` statt `display_name` gespeichert
- [x] 9.2 Drink-Name → Mapping via `drinkNameToId` (aus `useDrinkRecipes()`)
- [x] 9.3 Milch ebenfalls als recipe_id
- [x] 9.4 Fallback: Toast-Warnung + display_name, wenn kein Drink-Rezept gefunden

## 10. Tests

- [x] 10.1 Backend-Test: `GET /api/supply/breakfast-catalog/drinks/` gibt korrekte Response (bereits vorhanden in `TestBreakfastDrinks`)
- [x] 10.2 Backend-Test: `MealItemOut`-Resolver für `ingredient_tags` und `recipe_type` (erweitert in `test_create_ref_meal_with_items`)
- [ ] 10.3 Frontend-Test: `refMealItemsToWizardState` Mapping — **blockiert**: kein Test-Framework in frontend-food (nur TypeScript, kein Vitest/Jest)
- [x] 10.4 Frontend-TypeScript: `cd frontend-food && npx tsc --noEmit` — keine neuen Fehler (nur pre-existing in IngredientDetailPage.tsx)

## 11. Validierung

- [ ] 11.1 Manuell: Wizard öffnen, Frühstück konfigurieren, speichern → in Vorschau korrekt gruppiert angezeigt
- [ ] 11.2 Manuell: Vorschau-Seite lädt direkt (ohne RefMeal) → Redirect zu Wizard
- [ ] 11.3 Manuell: Bestehendes RefMeal im Wizard öffnen → Schritte vorausgefüllt
- [ ] 11.4 Manuell: Abbrechen → zurück zur Vorschau ohne Änderungen
- [ ] 11.5 Manuell: Energie getrennt (Essen/Getränke) angezeigt
- [ ] 11.6 Manuell: Non-Breakfast-RefMeal (z.B. Mittag) zeigt ingredient_name korrekt
