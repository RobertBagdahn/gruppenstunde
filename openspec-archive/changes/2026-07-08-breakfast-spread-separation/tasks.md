## 1. Backend — Tag & Seed Data

- [x] 1.1 Tag `breakfast-fat` in `seed_breakfast_catalog.py` aufnehmen (neben breakfast-base, breakfast-topping, breakfast-drink, breakfast-warm-meal)
- [x] 1.2 Neue Margarine-Zutat in `seed_breakfast_catalog.py` anlegen: name="Margarine", slug="margarine", 717 kcal, 8€/kg, Portion 8g (rank=1), Packung (500g)
- [x] 1.3 Bestehende Butter-Zutat in `seed_breakfast_catalog.py` um Tag `breakfast-fat` ergänzen
- [x] 1.4 Migration-Skript erstellen: existierende Butter-Zutat (slug="butter") mit Tag `breakfast-fat` verknüpfen

## 2. Backend — Catalog API

- [x] 2.1 `FatIngredientOut`-Schema in `breakfast_catalog.py` definieren (analog `ToppingIngredientOut`)
- [x] 2.2 `BreakfastCatalogOut` um `fat_ingredients: list[FatIngredientOut]` erweitern
- [x] 2.3 `GET /breakfast-catalog/`-Query um `breakfast-fat`-Tag-Filter erweitern

## 3. Frontend — Zod Schemas & Types

- [x] 3.1 `FatSelectionSchema` in `breakfast.ts` definieren (analog `ToppingSelectionSchema`, ingredientId + name + sharePercent + locked + energyKcal100g + pricePerKg + portions)
- [x] 3.2 `FatIngredientSchema` in `breakfast.ts` definieren (analog `ToppingIngredientSchema`)
- [x] 3.3 `BreakfastCatalogSchema` um `fat_ingredients: z.array(FatIngredientSchema)` erweitern
- [x] 3.4 `WizardStateSchema` um `fatSelections: z.array(FatSelectionSchema)` erweitern
- [x] 3.5 `defaultWizardState()` um `fatSelections: []` ergänzen

## 4. Frontend — Kcal-Berechnung (breakfastCalc.ts)

- [x] 4.1 `computeFatKcal(fats: FatSelection[]): number` — berechnet Kcal aus sharePercent × 8g × energyKcal100g
- [x] 4.2 `computeGroupKcal` Signatur ändern: `(basis, toppings, fats, dayPartFactor, fixKcal) → { breadKcal, fatKcal, toppingKcal }`
- [x] 4.3 breadKcal fix aus gramsPerPerson × kcalDensity berechnen (nicht mehr proportional)
- [x] 4.4 `normalizeScale` um fatKcal erweitern (nur Belag skalieren)
- [x] 4.5 `totalKcalPerPerson` um fatKcal erweitern
- [x] 4.6 Tests in `breakfastCalc.test.ts` für neue/geänderte Funktionen

## 5. Frontend — Wizard State & Steps

- [x] 5.1 `useWizardState.ts`: Schritt-Reihenfolge auf 6 Schritte ändern: basis → fett → belag → extras → getraenke → cockpit
- [x] 5.2 Neue Actions in `useWizardState`: `setFatShare`, `setFatLocked`, `initFats`
- [x] 5.3 Neue Step-Komponente `StepStreichfett.tsx` erstellen: Slider-Liste (Butter/Margarine/KeinFett) mit ShareSlider, rebalanceShares
- [x] 5.4 "Kein Fett" als virtuelle FatSelection mit ingredientId=0 anhängen
- [x] 5.5 Default-Initialisierung: erstes Fat-Ingredient 50%, Kein Fett 50%
- [x] 5.6 Step in `BreakfastWizardPage.tsx` einbinden (render zwischen step==='basis' and step==='belag')

## 6. Frontend — Cockpit

- [x] 6.1 `StepCockpit.tsx`: Streichfett-Sektion zwischen Brot and Belag einfügen
- [x] 6.2 Pro aktivem Streichfett: Zeile mit Gramm, kcal, Kosten, Prozent
- [x] 6.3 Gesamt-Zeile "Streichfett gesamt" mit summierten Werten
- [x] 6.4 Energie-Balken: Streichfett-Kcal in Gesamt-Kcal einfließen lassen

## 7. Frontend — Speichern & Laden

- [x] 7.1 `buildItems()` in `BreakfastWizardPage`: Streichfette als MealItems aufnehmen
- [x] 7.2 `refMealToWizardState.ts`: Items mit Tag `breakfast-fat` in `fatSelections` parsen (nicht in toppings)
- [x] 7.3 Migration-Logik: Item mit beiden Tags (`breakfast-topping` + `breakfast-fat`) → in fats

## 8. Tests

- [x] 8.1 Backend-Tests: all 22 existing tests pass
- [x] 8.2 Frontend-Tests: `computeFatKcal` (5 tests: empty, KeinFett, single, multiple, mixed)
- [x] 8.3 Frontend-Tests: `computeGroupKcal` mit fats (fatKcal reduziert toppingKcal)
- [x] 8.4 Frontend-Tests: `rebalanceShares` generic (gleicher Mechanismus für Fett)
- [x] 8.5 Wizard-Integration: Schritt-Reihenfolge, buildItems mit fats
- [x] 8.6 `refMealToWizardState` mit breakfast-fat Items
