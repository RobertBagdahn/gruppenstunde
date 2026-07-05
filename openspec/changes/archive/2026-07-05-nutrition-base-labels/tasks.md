## 1. NutritionBaseBadge Komponente

- [x] 1.1 Erstelle `frontend-food/src/components/recipe/NutritionBaseBadge.tsx` mit `{ base: 'per_100g' | 'per_portion' | 'total' }` Interface
- [x] 1.2 Implementiere drei Farbvarianten: emerald (per_100g), amber (per_portion), sky (total)
- [x] 1.3 Verwende deutsche Labels: "pro 100g", "pro Portion", "gesamt"
- [x] 1.4 Styling: text-[10px], px-1.5 py-0.5, rounded-full, font-medium

## 2. NutritionTab – Badges + Header-Korrekturen

- [x] 2.1 Füge Badge "pro 100g" neben "Nährwerte pro 100g"-Titel
- [x] 2.2 Korrigiere "Gesamtnährwerte (pro 100g)" → "Gesamtnährwerte" + Badge "gesamt"
- [x] 2.3 Füge Badge "pro Portion" in AnalysisSection bei CollapsibleContributions

## 3. RecipeDetailHelpers – Section-Header Umbennung

- [x] 3.1 "Zutaten-Beiträge pro Nährwert" → "Zutaten-Beiträge pro Portion" in CollapsibleContributions
- [x] 3.2 Füge Badge "pro Portion" neben dem neuen Titel

## 4. RecipeImprovements – Badge pro Karte

- [x] 4.1 Füge Badge "pro Portion" im Karten-Header jeder Verbesserungsvorschlag-Karte, neben dem direction-Label ("Reduzieren"/"Erhöhen")

## 5. RecipeRulesBox – Badge im Header

- [x] 5.1 Füge Badge "pro Portion" neben "Rezeptregeln"-Titel im Section-Header

## 6. RecipeDetailPage – Frontend-Rechner (dirty items)

- [x] 6.1 Prüfe ob der Frontend-Rechner bei local modified items Badge-Updates benötigt – Badges sind statisch pro Section, keine Änderung nötig
- [x] 6.2 Stelle sicher, dass Badge "pro Portion" auch im Rechner-Zustand korrekt ist – nb-Shape identisch, Badges passen

## 7. HealthTab – Badge pro 100g

- [x] 7.1 Prüfe ob "Gesundheitsindikatoren (pro 100g)" bereits klar genug ist (laut Design: keine Änderung nötig)

## 8. Lint & Verify

- [x] 8.1 Lint-Prüfung: `cd frontend-food && npx tsc --noEmit` – 0 errors
- [ ] 8.2 Manuelle Prüfung auf 320px und Desktop (bitte selbst im Browser testen)
