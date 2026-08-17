## 1. Backend — Extra-Zutaten kcal Endpoint

- [x] 1.1 Neuen API-Endpoint `POST /api/meal-plans/{plan_id}/calculate-ingredient-kcal/` erstellen: akzeptiert Array von `{ingredient_id, quantity_g}`, liefert `{ingredient_id, energy_kcal}` zurück
- [x] 1.2 Pydantic-Schema für Request/Response erstellen
- [x] 1.3 Endpoint in `recipe/api/` oder `supply/api/` registrieren
- [x] 1.4 Backend-Tests für den neuen Endpoint schreiben

## 2. Frontend — Kalkulations-Logik (`breakfastCalc.ts`)

- [x] 2.1 `beToGrams()` entfernen (nicht mehr benötigt)
- [x] 2.2 `basisKcalPerPerson()` auf Gramm-Basis umstellen: Parameter `gramsPerPerson` statt `bePerPerson`, Berechnung direkt aus Gramm × energyKcal100g
- [x] 2.3 `toppingKcalPerPerson()` auf Gramm-Basis umstellen: deckt `gramsPerPerson` Belag ab, nicht mehr BE-basiert
- [x] 2.4 `toppingGramsPerPerson()` auf Gramm-Basis umstellen
- [x] 2.5 `belagCoverageRatio()` auf Gramm-Verhältnis Brot:Belag umstellen
- [x] 2.6 `isBelagCovered()` entsprechend anpassen
- [x] 2.7 `normalizeBePerPerson()` umbenennen zu `normalizeGrams()`: skaliert Brot-Gramm + Belag-Gramm proportional
- [x] 2.8 `totalKcalPerPerson()` um Extras + warme Gerichte erweitern (bisher `extrasKcalPerPerson()` gibt 0 zurück)
- [x] 2.9 `extrasKcalPerPerson()` implementieren: kcal aus warmDishRecipes + kcal aus Backend für extraIngredients
- [x] 2.10 `energyTargetKcal()` default auf 0.30 ändern (oder Parameter weitergeben — siehe Task 4)
- [x] 2.11 `rebalanceShares()` prüfen: sollte ohne Änderung funktionieren (arbeitet auf sharePercent, nicht auf BE)

## 3. Frontend — Zod-Schemas (`breakfast.ts`)

- [x] 3.1 `WizardState` Schema: `bePerPerson` → `gramsPerPerson` umbenennen
- [x] 3.2 `BasisSelection` Schema: prüfen ob BE-bezogene Felder vorhanden sind (sliceWeightG bleibt, energyKcal100g bleibt)
- [x] 3.3 `ToppingSelection` Schema: unverändert (arbeitet auf Portionen/Gramm, nicht BE)
- [x] 3.4 `defaultWizardState()`: `bePerPerson`-Default durch `gramsPerPerson`-Default ersetzen

## 4. Frontend — Wizard State (`useWizardState.ts`)

- [x] 4.1 `useWizardState` Hook: `bePerPerson` State → `gramsPerPerson` umbenennen (Initialwert z.B. 150g)
- [x] 4.2 `setBePerPerson` → `setGramsPerPerson` umbenennen
- [x] 4.3 Alle Setter/Getter, die BE referenzieren, auf Gramm umstellen
- [x] 4.4 Gramm-basierte Default-Werte prüfen

## 5. Frontend — StepBasis (`StepBasis.tsx`)

- [x] 5.1 BE-Slider durch Gramm-Slider ersetzen (z.B. 50–300g in 10er-Schritten)
- [x] 5.2 Anzeige: "X g Brot pro Person" statt "X BE pro Person"
- [x] 5.3 Verteilungs-Slider: Gramm-Anteile pro Sorte anzeigen (statt BE-Anteile)
- [x] 5.4 Gramm + kcal pro Sorte anzeigen

## 6. Frontend — StepBelag (`StepBelag.tsx`)

- [x] 6.1 BE-basierte Deckung durch Gramm-basiertes Verhältnis ersetzen
- [x] 6.2 Doppelcheck Belag-Deckung: Gramm-Brot vs. Gramm-Belag vergleichen
- [x] 6.3 Warnhinweis-Text anpassen: "Brot:Belag-Verhältnis unausgewogen" statt "X Brote unbelegt"
- [x] 6.4 Intensität (knapp/normal/üppig) bleibt unverändert

## 7. Frontend — StepCockpit (`StepCockpit.tsx`)

- [x] 7.1 Cockpit-Tabelle: Brot-Items zeigen `{gramm}g ({portionszahl} Scheibe)` statt `×{bePerPerson × sharePercent} Scheibe`
- [x] 7.2 Belag-Items zeigen `{gramm}g ({portionszahl} Portion)` statt `×{bePerPerson × sharePercent/totalShare} Portion`
- [x] 7.3 Summenzeilen: "Brote gesamt: {gramm}g" statt "×{sum} Scheibe"
- [x] 7.4 Extras + warme Gerichte ins Energie-Ist einrechnen (bisher 0 kcal)
- [x] 7.5 Ampel auf dreistufig umstellen (<80% rot, 80-110% grün, 110-120% gelb, >120% rot)
- [x] 7.6 `handleNormalize()` auf `normalizeGrams()` umstellen
- [x] 7.7 Alle BE-Referenzen aus dem JSX entfernen

## 8. Frontend — Rekonstruktion aus RefMeal (`refMealToWizardState.ts`)

- [x] 8.1 Rekonstruktion von `bePerPerson` → `gramsPerPerson` umstellen
- [x] 8.2 Gramm-Werte aus MealItem.quantity + measuring_unit ableiten
- [x] 8.3 BE-Berechnung in der Rekonstruktionslogik entfernen

## 9. Frontend — BreakfastWizardPage + Settings

- [x] 9.1 `BreakfastWizardPage.tsx`: `dayPartFactor` default auf 0.30 ändern (Zeile ~45: `existingRefMeal?.day_part_factor ?? 0.30`)
- [x] 9.2 `SettingsPanel.tsx`: Breakfast default day_part_factor auf 0.30 ändern
- [x] 9.3 Beide Änderungen propagieren: falls Prozentsatz im UI angezeigt wird, "30%" statt "25%" oder "20%"

## 10. Frontend — API-Hooks (`breakfast.ts`)

- [x] 10.1 `useBreakfastLeftovers` prüfen: ob BE-bezogene Parameter übergeben werden — ggf. auf Gramm umstellen
- [x] 10.2 Neuen Hook `useIngredientKcal` (oder ähnlich) für den neuen Backend-Endpoint aus Task 1 erstellen

## 11. Tests

- [x] 11.1 Backend-Tests für `POST /api/meal-plans/{plan_id}/calculate-ingredient-kcal/`
- [x] 11.2 Frontend-Tests für `breakfastCalc.ts` mit Gramm-Basis
- [x] 11.3 Wizard-Durchlauftest: von Step 1 bis Cockpit ohne BE
- [x] 11.4 Test: Normalisieren skaliert Brot+Belag korrekt
- [x] 11.5 Test: Cockpit zeigt Gramm + natürliche Einheiten
- [x] 11.6 Test: Ampel zeigt korrekte Farbe bei Unter-/Überdeckung
- [x] 11.7 Test: Extras-Kcal fließen ins Energie-Ist
