## 1. Backend — Zentrale Formatierungs-Utility

- [x] 1.1 `backend/supply/utils.py` anlegen mit `format_weight(grams: float) -> str` (mg/g/kg-Stufen, deutsche Zahlenformatierung)
- [x] 1.2 `build_portion_display(quantity, portion, ingredient) -> tuple[str, bool]` in `backend/supply/utils.py` implementieren (gibt `(display_str, has_missing_weight)` zurück)
- [x] 1.3 Sonderfälle in `build_portion_display` abdecken: Stück-Unterdrückung, fehlender ingredient.name → Slug-Fallback, fehlende `weight_g` → kein Gramm-Klammer
- [x] 1.4 `build_package_display(quantity_g, ingredient) -> str` in `backend/supply/utils.py` implementieren (Packungsoptionen berechnen und formatieren)

## 2. Backend — Recipe-Schemas anpassen

- [x] 2.1 `RecipeItemOut` in `backend/recipe/schemas/` um `portion_display: str` und `has_missing_weight: bool` ergänzen
- [x] 2.2 Resolver/Validator für `portion_display` in `RecipeItemOut` implementieren (nutzt `build_portion_display` aus supply/utils.py)
- [x] 2.3 Sicherstellen dass `RecipeItemOut` alle nötigen Felder lazy lädt (ingredient.name, portion.measuring_unit.name, portion.weight_g)

## 3. Backend — Planner-Schemas anpassen

- [x] 3.1 `MealItemOut` in `backend/planner/schemas/` um `portion_display: str` und `is_per_norm_person: bool` ergänzen
- [x] 3.2 Resolver für `portion_display` auf `MealItemOut` implementieren — Gewicht dividiert durch `meal_plan.norm_portions`, `is_per_norm_person=True` setzen
- [x] 3.3 Sicherstellen dass `norm_portions` im Kontext des Resolvers verfügbar ist (ggf. über Schema-Kontext oder expliziten Parameter)

## 4. Backend — Shopping-Schemas anpassen

- [x] 4.1 `display_quantity`-Berechnung in `backend/shopping/schemas.py` auf neue `format_weight()` aus `supply/utils.py` umstellen
- [x] 4.2 Packungsoptionen an `display_quantity`-String anhängen: `"{gramm} · {n}×{packung} · {m}×{packung}"` — nutzt `build_package_display()`
- [x] 4.3 Datenbankabfrage für Packungsportionen effizient gestalten (kein N+1: Portionen prefetchen)

## 5. Backend — Tests

- [x] 5.1 Unit-Tests für `format_weight()` schreiben: alle Schwellenwerte (mg, g-Stufen, kg), Kantenfälle (genau 1g, genau 1000g)
- [x] 5.2 Unit-Tests für `build_portion_display()` schreiben: Stück-Unterdrückung, fehlende weight_g, fehlender ingredient-Name, mg-Schwelle
- [x] 5.3 Unit-Tests für `build_package_display()` schreiben: Aufrunden, Abrunden bei < 10% Rest, mehrere Packungsgrößen, keine Packungen vorhanden

## 6. Frontend — Zod-Schemas synchronisieren

- [x] 6.1 `frontend-food/src/schemas/recipe.ts` — `RecipeItemOut` um `portionDisplay: z.string()` und `hasMissingWeight: z.boolean()` ergänzen
- [x] 6.2 `frontend-food/src/schemas/mealPlan.ts` — `MealItemOut` um `portionDisplay: z.string()` und `isPerNormPerson: z.boolean()` ergänzen
- [x] 6.3 `frontend-food/src/schemas/shoppingList.ts` — sicherstellen dass `displayQuantity` den neuen Packungsstring korrekt validiert (kein Schema-Breaking-Change nötig, da es ein String bleibt)

## 7. Frontend — formatWeight Utility aktualisieren

- [x] 7.1 `frontend-food/src/utils/formatWeight.ts` um mg-Schwelle ergänzen (`< 1g → Xmg`)
- [x] 7.2 Deutsche Zahlenformatierung sicherstellen (`1,5 kg` statt `1.5 kg`) in `formatWeight()`
- [x] 7.3 `frontend-food/src/lib/unitConversion.ts` — `formatWeight()` dort ebenfalls um mg-Stufe ergänzen (Konsistenz)

## 8. Frontend — Rezeptansicht

- [x] 8.1 `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` — Zutatenliste auf `portionDisplay` umstellen
- [x] 8.2 `frontend-food/src/pages/recipes/EditRecipePage.tsx` — `portionDisplay` als Vorschau neben dem Mengeninput anzeigen
- [x] 8.3 Orange-Markierung für `hasMissingWeight == true` in Rezept-Zutatzeilen implementieren (Tailwind: `text-orange-500` oder Icon)

## 9. Frontend — Essensplan-Views

- [x] 9.1 `frontend-food/src/pages/planning/MealSlot.tsx` — Zutatanzeige auf `portionDisplay` umstellen
- [x] 9.2 `frontend-food/src/pages/planning/DayPlanView.tsx` — `portionDisplay` nutzen
- [x] 9.3 `frontend-food/src/pages/planning/TableView.tsx` — `portionDisplay` in Tabellenansicht nutzen
- [x] 9.4 NormPerson-Hinweis-Badge implementieren wenn `isPerNormPerson == true` (kleiner Badge „pro Person\", Tailwind-gestylt)
- [x] 9.5 Orange-Markierung für `hasMissingWeight` in Essensplan-Views

## 10. Frontend — Kochplan

- [x] 10.1 `frontend-food/src/pages/planning/CookingSchedulePage.tsx` — Zutatanzeige auf `portionDisplay` umstellen

## 11. Frontend — Einkaufsliste

- [x] 11.1 `frontend-food/src/components/shopping/ShoppingListItemRow.tsx` — `displayQuantity` anzeigen (enthält jetzt Packungsoptionen wenn vorhanden)
- [x] 11.2 Sicherstellen dass das ` · `-Trennzeichen zwischen Gramm und Packungsoptionen korrekt gerendert wird (kein HTML-Escaping-Problem)
- [x] 11.3 Visuelle Darstellung der Packungsoptionen prüfen — bei langen Strings ggf. `text-ellipsis` oder Umbruch
