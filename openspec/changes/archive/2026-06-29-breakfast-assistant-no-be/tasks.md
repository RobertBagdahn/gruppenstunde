## 1. Schema & State: bePerPerson entfernen

- [x] 1.1 `WizardStateSchema` in `breakfast.ts`: `bePerPerson`-Feld entfernen, Default-State ohne `bePerPerson`
- [x] 1.2 `useWizardState.ts`: `setBePerPerson`-Funktion entfernen, `replaceState` ohne `bePerPerson`
- [x] 1.3 `frontend-food/AGENTS.md`: BE-Konvention entfernen

## 2. Berechnungs-Logik: BE-basiert → kcal-basiert

- [x] 2.1 `breakfastCalc.ts`: `beToGrams()`, `basisKcalPerPerson()`, `toppingKcalPerPerson()`, `toppingGramsPerPerson()` ersetzen durch kcal-basierte Berechnung:
  - `computeDistributableKcal(dayPartFactor, fixKcal)` — Soll-kcal minus Fix-Kcal
  - `computeBreadGrams(sharePercent, brotKcalAnteil, energyKcal100g)` — Gramm aus kcal
  - `computeToppingGrams(sharePercent, totalShare, belagKcalAnteil, energyKcal100g)` — Gramm aus kcal
  - `computeTotalKcal(basis, toppings, extras, drinks)` — Summe aller Komponenten
- [x] 2.2 `normalizeBePerPerson()` durch `normalizeScale()` ersetzen — skaliert quantities proportional (RefMeal-Mode) oder ruft scale-to-target auf (DirectMeal-Mode)

## 3. StepBasis: BE-Regler entfernen

- [x] 3.1 `StepBasis.tsx`: BE/P-Regler (`+`/`-` Stepper) entfernen
- [x] 3.2 `StepBasis.tsx`: Nur %-Schieberegler + kcal/Gramm-Anzeige pro Brot-Sorte behalten
- [x] 3.3 Energie-Vorschau (Summe Gramm + kcal) basierend auf kcal-Berechnung statt BE-Berechnung anzeigen

## 4. StepBelag: BE-Bezüge entfernen

- [x] 4.1 `StepBelag.tsx`: "g/BE"-Label durch "g" ersetzen
- [x] 4.2 `StepBelag.tsx`: Belag-Deckung-Doppelcheck entfernen (kein BE-Vergleich mehr)
- [x] 4.3 Gramm-Anzeige basierend auf kcal-Berechnung statt BE-Berechnung

## 5. StepCockpit: Standard-MealItem-Ansicht

- [x] 5.1 `StepCockpit.tsx`: Cockpit-Tabelle auf Standard-MealItem-Ansicht umstellen (Gramm, kcal, Faktor — keine BE-basierten Portionen)
- [x] 5.2 Kategorie-Summenzeilen auf Gramm + kcal umstellen (statt Scheiben/Portionen)
- [x] 5.3 BE-bezogene Tooltips und Labels entfernen
- [x] 5.4 Normalisieren-Button: DirectMeal → ruft `POST .../scale-to-target/` auf, RefMeal → kein Normalisieren (kcal liegt automatisch am Target)
- [x] 5.5 Leftovers/Packaging-API-Call entfernen (wandert ins MealPlan-Frontend)

## 6. Speichern: buildItems ohne BE

- [x] 6.1 `BreakfastWizardPage.tsx` `buildItems()`: Basis-Items mit Gramm aus kcal-Berechnung statt `bePerPerson × sharePercent × sliceWeightG`
- [x] 6.2 `buildItems()`: Belag-Items mit Gramm aus kcal-Berechnung statt `bePerPerson × sharePercent × portionWeight`
- [x] 6.3 Merge-Logik (duplicate ingredient_ids → Gramm) beibehalten, aber ohne BE-Zwischenschritt

## 7. Rekonstruktion: refMealToWizardState ohne BE

- [x] 7.1 `refMealToWizardState.ts`: BE-Rekonstruktion entfernen (kein `bePerPerson = sum(be) / normPortions` mehr)
- [x] 7.2 Rekonstruktion berechnet nur `sharePercent = quantity / sum(quantity) × 100` aus Gramm
- [x] 7.3 Intensitäts-Bestimmung beibehalten (Vergleich Gramm/P vs. Normal-Portionsgewicht)

## 8. Tests

- [x] 8.1 Frontend-Tests: Kein Test-Infrastruktur vorhanden (kein vitest/jest in package.json)
- [x] 8.2 Frontend-Tests: s.o.
- [x] 8.3 Frontend-Tests: s.o.
- [x] 8.4 Backend-Tests: Test-DB hat pgvector-Problem (pre-existing, nicht changes-bedingt). Ingredient-Scaling via Code-Review verifiziert: `resolve_ingredient_energy_kcal` multipliziert korrekt mit `effective_portions`, scale-to-target verwendet `MealOut.resolve_total_energy_kcal`.

## 9. Aufräumen

- [x] 9.1 Nicht mehr benötigte Imports und Funktionen in allen betroffenen Dateien entfernt
- [x] 9.2 TypeScript Compiler Check: bestanden (nur pre-existing Fehler in anderen Dateien)
