## 1. IngredientList: PortionScaler entfernen und Schrift vergrößern

- [x] 1.1 In `frontend-food/src/components/supply/IngredientList.tsx`: PortionScaler-Import und -Rendering entfernen
- [x] 1.2 In `frontend-food/src/components/supply/IngredientList.tsx`: Props `onServingsChange` entfernen (nur `servingsMultiplier` behalten)
- [x] 1.3 In `frontend-food/src/components/supply/IngredientList.tsx`: Schriftgröße von `text-sm` auf `text-base` ändern für Zutaten-Items
- [x] 1.4 Gleiche Änderungen in `frontend/src/components/supply/IngredientList.tsx` durchführen

## 2. RecipeDetailPage: Sektions-Reihenfolge und Portionen-Logik

- [x] 2.1 In `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: Zutaten-Sektion (Zeile ~925-995) nach oben verschieben, direkt unter Hero-Bereich (vor Nutritional Tags)
- [x] 2.2 Portionen-Header-Text ändern: "pro Portion" bei multiplier=1, "für X Portionen" bei multiplier>1
- [x] 2.3 Mengen-Berechnung anpassen: `quantity / recipe.servings * portionCount` statt `quantity * servingsMultiplier`
- [x] 2.4 `servingsMultiplier` State-Default auf 1 setzen (= 1 Portion), PortionScaler-Integration in IngredientList-Aufruf entfernen (`onServingsChange` Prop entfernen)

## 3. Sidebar-Scaler fixen

- [x] 3.1 In `frontend-food/src/components/recipe/RecipeSidebar.tsx`: `onServingsChange` direkt den Scaler-Wert als Multiplier durchreichen (nicht mehr durch `recipe.servings` teilen)
- [x] 3.2 In `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: Sidebar `onServingsChange` Callback vereinfachen zu `setServingsMultiplier` direkt
- [x] 3.3 PortionScaler `defaultServings` auf 1 setzen (nicht `effectiveServings`)
- [x] 3.4 Gleiche Änderungen in `frontend/src/components/recipe/RecipeSidebar.tsx` durchführen

## 4. Verifizierung

- [ ] 4.1 Manuell prüfen: Zutaten erscheinen direkt unter Hero
- [ ] 4.2 Manuell prüfen: Default zeigt "pro Portion" mit normierten Mengen
- [ ] 4.3 Manuell prüfen: Sidebar-Scaler auf 4 setzen → Mengen vervierfachen sich, Header zeigt "für 4 Portionen"
- [ ] 4.4 Manuell prüfen: Kein PortionScaler mehr in der Zutatenliste selbst
