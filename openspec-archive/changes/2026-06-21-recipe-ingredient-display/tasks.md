## 1. IngredientList — Portionsauswahl-Logik korrigieren

- [x] 1.1 In `frontend-food/src/components/supply/IngredientList.tsx` den `highPrioPortion`-Filter von `!p.is_default` auf `priority DESC` umstellen — die Portion mit dem höchsten `priority`-Wert, die keine Gramm-Einheit und `weight_g > 0` hat, wird als Primäranzeige verwendet
- [x] 1.2 Sicherstellen, dass auch Portionen mit `is_default: true` als Primäranzeige infrage kommen, sofern sie keine Gramm-Einheit sind
- [x] 1.3 Fallback implementieren: Wenn keine nicht-Gramm-Portion mit `weight_g > 0` gefunden wird, die nächste Portion mit höchstem `priority`-Wert (unabhängig von Gramm/nicht-Gramm) als Sekundäranzeige zeigen

## 2. IngredientList — Mengen-Ampel implementieren

- [x] 2.1 In `IngredientList.tsx` das Gesamtgewicht aller Items berechnen (`totalWeightG = items.reduce((s, i) => s + i.weight_g * portionsMultiplier, 0)`)
- [x] 2.2 Pro Zutat den prozentualen Anteil berechnen und bei > 70% ein ⚠️-Symbol (Lucide `AlertTriangle`, `text-amber-500`, klein) neben der Zeile anzeigen
- [x] 2.3 Ampel nur anzeigen wenn `totalWeightG > 0` (kein leeres Rezept)

## 3. RecipeDetailPage — Icon und Badge aktualisieren

- [x] 3.1 In `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` das `egg_alt` Material Symbol durch `UtensilsCrossed` aus Lucide ersetzen (Import hinzufügen)
- [x] 3.2 Den Anzahl-Badge von `{recipe.recipe_items?.length}` auf `{recipe.recipe_items?.length} Zutaten` ändern

## 4. InlineIngredientEditor — Smart Default beim Hinzufügen

- [x] 4.1 In `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` die `handleAddIngredient`-Funktion anpassen: Nach dem API-Aufruf für Portionen die Portion mit dem höchsten `priority`-Wert und `weight_g > 0` als Default auswählen (statt `portions.find(p.is_default) || portions[0]`)
- [x] 4.2 Die `quantity` beim Hinzufügen auf `1` setzen statt `0`
- [x] 4.3 Sicherstellen, dass `measuring_unit_name` aus der ausgewählten Best-Priority-Portion korrekt gesetzt wird

## 5. Weitere Rezept-Ansichten prüfen und anpassen

- [x] 5.1 `frontend-food/src/pages/planning/RecipePreviewDialog.tsx` prüfen ob `IngredientList` verwendet wird — falls ja, sicherstellen dass Icon und Badge-Änderungen dort ebenfalls gelten (da `IngredientList` eine gemeinsame Komponente ist, sind die Änderungen automatisch wirksam; nur Header-spezifische Anpassungen manuell prüfen)
- [x] 5.2 `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` prüfen ob Zutatenliste dort gerendert wird und ggf. Badge/Icon konsistent halten
