## 1. Fix servingsMultiplier-Berechnung

- [x] 1.1 In `frontend/src/pages/recipes/RecipeDetailPage.tsx` Zeile 33: `servingsMultiplier` von `effectiveServings / recipe.servings` zu `effectiveServings` ändern
- [x] 1.2 Prüfen ob andere Stellen `servingsMultiplier` mit derselben falschen Formel berechnen (grep nach `/ recipe.servings` bzw. `/ recipe?.servings`)

## 2. Safeguard in formatQuantity

- [x] 2.1 In `frontend/src/lib/unitConversion.ts`: `formatQuantity` Guard `if (grams <= 0)` auf `if (grams < 0.01)` einschränken — Werte >= 0.01g werden immer korrekt aufgerundet
- [x] 2.2 `smartRound` verifizieren: bei Werten > 0 und < 0.1 soll mindestens 0.1 zurückkommen (aktuell `Math.ceil(value * 10) / 10` — ist bereits korrekt für > 0)

## 3. Tests aktualisieren

- [x] 3.1 `frontend/src/lib/unitConversion.test.ts`: Test für `scaleQuantity` verifiziert — bereits korrekt (testet `baseQuantity × servings`)
- [x] 3.2 Test hinzufügen: `formatQuantity(0.001, ...)` darf nicht "0 g" ergeben
- [x] 3.3 Test hinzufügen: `formatQuantity(0, ...)` soll weiterhin "0 g" ergeben
