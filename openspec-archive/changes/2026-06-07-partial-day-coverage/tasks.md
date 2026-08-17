## 1. Core Coverage Helpers

- [x] 1.1 Add `getDayCoverage(meals: Meal[]): number` to `schemas/mealPlan.ts` — summiert `day_part_factor` exkl. drinks, capped bei 1.0
- [x] 1.2 Add `getEffectiveCoverage(coverage: number): number` — `Math.max(coverage, 0.35)`
- [x] 1.3 Add `getCoverageBadge(coverage: number): { label: string; status: 'green' | 'yellow' | 'red'; effectiveCoverage: number }` — Badge-Farbe/Label-Logik
- [x] 1.4 Add `MEAL_TYPE_DEFAULT_TIMES` als geteilte Konstante nach `schemas/mealPlan.ts` (aus `MealEventDetailPage.tsx` extrahieren)
- [x] 1.5 Add `getSkippedMealTypes(date: string, startDatetime?: string, endDatetime?: string): string[]` — berechnet welche Meal-Typen auf Randtagen fehlen

## 2. TableView — Graue Zellen und Coverage-Badge

- [x] 2.1 `TableView` Props erweitern: `startDatetime?: string`, `endDatetime?: string`
- [x] 2.2 Graue Zellen-Logik: Zellen auf ersten/letzten Tagen für geskippte Meal-Typen mit `bg-muted/30` und Hinweistext rendern (kein Dropdown, kein roter "Mahlzeit leer"-Alert)
- [x] 2.3 Coverage-Badge in `tfoot`-Tagesbilanz-Zelle einfügen (zwischen kcal und Kosten)
- [x] 2.4 `MealEventDetailPage.tsx` aktualisieren: `startDatetime` und `endDatetime` an `TableView` übergeben
- [x] 2.5 TableView `dailyTotals`-Berechnung: Cost-Budget-Vergleich mit `effectiveCoverage` skalieren

## 3. DayPlanView — Coverage-Badge im Tag-Header

- [x] 3.1 Coverage-Badge im DayPlanView Tag-Header neben Datum und kcal-Anzeige einfügen
- [x] 3.2 Coverage-Berechnung pro Tag aus den Meals des Tages

## 4. NutritionView — Coverage-skalierte Targets

- [x] 4.1 Coverage-Badge auf Datums-Buttons anzeigen (einzeln + "Gesamter Plan" mit Ø-Coverage)
- [x] 4.2 DGE-Referenzwerte (aus `NUTRITION_FALLBACKS` und DB-rules) mit `effectiveCoverage` multiplizieren (bei Tag-Auswahl: Tag-Coverage; bei Gesamtplan: Ø-Coverage)
- [x] 4.3 Hinweistext unter SollIstBar: "Skaliert auf X % Tagesabdeckung"
- [x] 4.4 `dailyPortionVal`-Berechnung prüfen und ggf. korrigieren (keine Division durch numDays wenn Coverage bereits skaliert)

## 5. CostDashboard — Coverage-skalierte Budgets

- [x] 5.1 Coverage-Badge in CostDashboard-Header/Zeilen anzeigen
- [x] 5.2 Budget-Vergleich mit `effectiveCoverage` skalieren

## 6. Integration & Tests

- [x] 6.1 TypeScript-Check: `npx tsc --noEmit` im `frontend-food/`-Verzeichnis — ✓ (nur pre-existing error in RecipeDetailPage)
- [x] 6.2 ESLint-Config erstellt (`eslint.config.js`) — 17 pre-existing errors/warnings, keine neuen durch meine Änderungen
- [x] 6.3 Build-Test: `npm run build` im `frontend-food/`-Verzeichnis — ✓
- [ ] 6.4 Manueller Test: Essensplan mit Zeitrahmen öffnen, Randtage prüfen (graue Zellen, Coverage-Badges, skalierte KPIs)
- [ ] 6.5 Manueller Test: Essensplan ohne Zeitrahmen öffnen (keine Regression — keine grauen Zellen)
