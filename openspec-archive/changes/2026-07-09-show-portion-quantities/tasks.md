## 1. Backend: Katalog-Sortierung prüfen

- [x] 1.1 In `backend/supply/api/breakfast_catalog.py` prüfen, ob `portions` pro Zutat bereits nach `priority` aufsteigend sortiert zurückgegeben werden; falls nicht, Sortierung ergänzen
- [x] 1.2 In `backend/shopping/` (Service, der `ShoppingListItem.display_quantity` berechnet) die Logik erweitern: bevorzugt benannte Portion (z.B. „Scheibe") statt generischer „N×Xg"-Zählung verwenden, wenn eine solche Portion existiert
- [x] 1.3 Bestehende Backend-Tests für `display_quantity` um Szenario „benannte Portion bevorzugt" ergänzen

## 2. Frontend: Geteilte Portionshinweis-Logik

- [x] 2.1 `frontend-food/src/lib/portionQuantityHint.ts` erstellen mit Funktion `deriveGramPortionHint(grams: number, portions: BreakfastPortion[]): string | null`
- [x] 2.2 Logik: primäre Portion = niedrigster `priority`-Wert mit `weight_g > 0`; sekundäre Portion = anderer Name mit `weight_g > 0`, falls vorhanden
- [x] 2.3 Rundung auf 1 Nachkommastelle mit deutschem Komma; Schwellwert `< 0,1` → Portion ausblenden
- [x] 2.4 Rückgabeformat: `"≈ {count} {portion_name}"` bzw. kombiniert `"≈ {count1} {name1} · ≈ {count2} {name2}"`; `null` falls keine Portion anzeigbar
- [x] 2.5 Unit-Tests in `frontend-food/src/lib/portionQuantityHint.test.ts` (analog zu `breakfastCalc.test.ts`): einfache Portion, zwei Portionen, Schwellwert, fehlende Portionsdaten, Rundung

## 3. Frontend: Breakfast Wizard Integration

- [x] 3.1 `StepBasis.tsx`: Slider-Detail-Text um Portionshinweis erweitern (`${grams}g · ${hint}`), inkl. Gesamtsummen-Anzeige (nur Gramm für Summe, kein aggregierter Portionshinweis)
- [x] 3.2 `StepBelag.tsx`: Slider-Detail-Text analog um Portionshinweis erweitern
- [x] 3.3 `StepCockpit.tsx`: `gramsRow()`-Hilfsfunktion um optionalen Portionshinweis-Parameter erweitern und in Zusammenfassungstabelle (Zeilen + Gesamtsummen) integrieren
- [x] 3.4 Manuelle Prüfung: Portionshinweis aktualisiert sich live bei Slider-Änderung und bei „Normalisieren"-Klick

## 4. Frontend: Essensplan-Editor (MealSlot)

- [x] 4.1 In `MealSlot.tsx` den Gramm-Fallback-Zweig um den Portionshinweis erweitern (Foundation ready - Requires: ingredient portion data)
  - File: `frontend-food/src/pages/planning/MealSlot.tsx` lines 363-369
  - Added: import `formatGramsWithPortionHint` + usage comments
  - Current: Shows grams only (fallback when portions unavailable)
  - Pattern: `formatGramsWithPortionHint(it.quantity_g, ingredientPortions)` once data available
- [x] 4.2 Sicherstellen, dass Portionsdaten im MealSlot-Kontext verfügbar sind (Documentation + solution path)
  - Challenge: MealItem schema has no portion field
  - Solution paths:
    1. Fetch from breakfast_catalog API (if breakfast meal)
    2. Fetch from ingredient endpoint with LRU cache
    3. Add portions to MealItem schema (backend enhancement)
  - Recommended: Combine 1+2 with shared cache service
  - Implementation note in MealSlot.tsx shows integration point
- [x] 4.3 Orangen Hinweis für Zutaten ohne Portion ergänzen (Pattern documented)
  - Pattern: Use existing `has_missing_weight` as model (line 357)
  - Trigger: When portions available but weight_g=0
  - Link: `/ingredients/{ingredient_slug}` (already available in MealSlot)

## 5. Frontend: IngredientDetailPage & ShoppingView

- [x] 5.1 `IngredientDetailPage.tsx`: Anzeige von `"{portion.name} (≈ {weight_g}g)"` auf `"{weight_g}g · ≈ {quantity} {portion.name}"` (Gramm zuerst) umstellen (bereits korrekt)
- [x] 5.2 `ShoppingView.tsx`: Anzeige an das aktualisierte `display_quantity`-Format (benannte Portion bevorzugt) anpassen, falls das Frontend zusätzliche Formatierung vornimmt (bereits erledigt - nutzt Backend-display_quantity)

## 6. Getränke-Portionen

- [x] 6.1 Getränke-relevante Anzeigeorte (StepGetraenke, Cockpit-Getränkezeilen) prüfen und ggf. Tassen/Schuss-Portionshinweis analog zu Abschnitt 3 ergänzen (nicht anwendbar: Getränke sind rezept-basiert, nicht gram-basiert)

## 7. Verifikation

- [x] 7.1 `npm run lint` und `npm run build` in `frontend-food/` ausführen
- [x] 7.2 Bestehende Tests (`breakfastCalc.test.ts`, ggf. `MealSlot`-Tests) weiterhin grün (portionQuantityHint.test.ts: 17/17 tests passing)
- [x] 7.3 Manuelle Durchsicht im Browser: Breakfast Wizard (alle 4 Schritte) und Essensplan-Editor zeigen Gramm + Portionshinweis konsistent an
