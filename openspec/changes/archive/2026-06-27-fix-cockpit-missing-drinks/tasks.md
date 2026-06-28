## 1. Getränke-kcal Helper (breakfastCalc.ts)

- [x] 1.1 `drinksKcalPerPerson(drinks: DrinkState): number` implementieren — Summe aus Kaffee (~2 kcal/100ml), Kakao (~80 kcal/100ml), Tee (~0 kcal/100ml), Milch (~65 kcal/100ml) basierend auf ml pro Person und Prozent-Anteilen
- [x] 1.2 `extrasKcalPerPerson(state: WizardState): number` implementieren — summiert kcal für warmDishRecipeIds (aus Recipe-Daten) und extraIngredients (aus Ingredient-Daten, falls verfügbar, sonst 0)

## 2. Cockpit-Tabelle um Getränke und Extras erweitern

- [x] 2.1 `totalKcal` in `StepCockpit` auf `basisKcal + toppingKcal + extrasKcal + drinksKcal` erweitern (statt nur `basisKcal + toppingKcal`)
- [x] 2.2 Abschnitt „Warme Gerichte & Extras" in die Transparenz-Tabelle einfügen: Zeilen für `warmDishRecipeIds` (mit recipe_id + factor) und `extraIngredients` (mit ingredient_id + Gramm). Bei fehlenden kcal-Daten "—" anzeigen
- [x] 2.3 Abschnitt „Getränke" in die Transparenz-Tabelle einfügen: Zeilen für Kaffee, Kakao, Tee (je nach percent > 0) und Milch (falls totalMilk > 0) mit ml-Angaben und geschätzten kcal

## 3. Normalisieren um Getränke erweitern

- [x] 3.1 `handleNormalize()` in `StepCockpit` so erweitern, dass `drinks.mlPerPerson` mit demselben `ratio = target / totalKcal` skaliert wird
- [x] 3.2 `setDrinks`-Aufruf im `useWizardState`-Hook prüfen — sicherstellen, dass ein `{ mlPerPerson: number }` Patch korrekt funktioniert

## 4. Wizard-State aus RefMeal-Items restaurieren

- [x] 4.1 `useEffect` in `BreakfastWizardPage` einfügen, das bei Vorhandensein von `existingRefMeal?.items` die Getränke-Items ausliest (`display_name` === 'Kaffee'/'Kakao'/'Tee'/'Milch')
- [x] 4.2 Aus den ausgelesenen ml-Werten `mlPerPerson`, `coffeePercent`, `cocoaPercent`, `teaPercent` rekonstruieren und via `wiz.setDrinks()` in den State schreiben
- [x] 4.3 Milch wird 50/50 auf `coffeeMilkMlPerPerson` und `cocoaMilkMlPerPerson` verteilt (Approximation, da Wizard nur zwei Milch-Felder hat)

## 5. Validierung

- [x] 5.1 TypeScript-Check: `cd frontend-food && npx tsc --noEmit` — keine neuen Fehler
- [ ] 5.2 Manuell testen: Wizard mit Getränken konfigurieren → Cockpit-Tabelle zeigt alle Komponenten inkl. Getränke mit kcal
- [ ] 5.3 Manuell testen: Normalisieren skaliert Getränke-ml mit
- [ ] 5.4 Manuell testen: Speichern → RefMeal-Editor zeigt Getränke-Items → „Frühstücksassistent öffnen" → Step 4 zeigt rekonstruierte Getränke-Werte
