## 1. Backend — Extra-Zutaten kcal Endpoint

- [ ] 1.1 Neuen API-Endpoint `POST /api/meal-plans/{plan_id}/calculate-ingredient-kcal/` erstellen: akzeptiert Array von `{ingredient_id, quantity_g}`, liefert `{ingredient_id, energy_kcal}` zurück
- [ ] 1.2 Pydantic-Schema für Request/Response erstellen
- [ ] 1.3 Endpoint in `recipe/api/` oder `supply/api/` registrieren
- [ ] 1.4 Backend-Tests für den neuen Endpoint schreiben

## 2. Frontend — Kalkulations-Logik (`breakfastCalc.ts`)

- [ ] 2.1 `beToGrams()` entfernen (nicht mehr benötigt)
- [ ] 2.2 `basisKcalPerPerson()` auf Gramm-Basis umstellen: Parameter `gramsPerPerson` statt `bePerPerson`, Berechnung direkt aus Gramm × energyKcal100g
- [ ] 2.3 `toppingKcalPerPerson()` auf Gramm-Basis umstellen: deckt `gramsPerPerson` Belag ab, nicht mehr BE-basiert
- [ ] 2.4 `toppingGramsPerPerson()` auf Gramm-Basis umstellen
- [ ] 2.5 `belagCoverageRatio()` auf Gramm-Verhältnis Brot:Belag umstellen
- [ ] 2.6 `isBelagCovered()` entsprechend anpassen
- [ ] 2.7 `normalizeBePerPerson()` umbenennen zu `normalizeGrams()`: skaliert Brot-Gramm + Belag-Gramm proportional
- [ ] 2.8 `totalKcalPerPerson()` um Extras + warme Gerichte erweitern (bisher `extrasKcalPerPerson()` gibt 0 zurück)
- [ ] 2.9 `extrasKcalPerPerson()` implementieren: kcal aus warmDishRecipes + kcal aus Backend für extraIngredients
- [ ] 2.10 `energyTargetKcal()` default auf 0.30 ändern (oder Parameter weitergeben — siehe Task 4)
- [ ] 2.11 `rebalanceShares()` prüfen: sollte ohne Änderung funktionieren (arbeitet auf sharePercent, nicht auf BE)

## 3. Frontend — Zod-Schemas (`breakfast.ts`)

- [ ] 3.1 `WizardState` Schema: `bePerPerson` → `gramsPerPerson` umbenennen
- [ ] 3.2 `BasisSelection` Schema: prüfen ob BE-bezogene Felder vorhanden sind (sliceWeightG bleibt, energyKcal100g bleibt)
- [ ] 3.3 `ToppingSelection` Schema: unverändert (arbeitet auf Portionen/Gramm, nicht BE)
- [ ] 3.4 `defaultWizardState()`: `bePerPerson`-Default durch `gramsPerPerson`-Default ersetzen

## 4. Frontend — Wizard State (`useWizardState.ts`)

- [ ] 4.1 `useWizardState` Hook: `bePerPerson` State → `gramsPerPerson` umbenennen (Initialwert z.B. 150g)
- [ ] 4.2 `setBePerPerson` → `setGramsPerPerson` umbenennen
- [ ] 4.3 Alle Setter/Getter, die BE referenzieren, auf Gramm umstellen
- [ ] 4.4 Gramm-basierte Default-Werte prüfen

## 5. Frontend — StepBasis (`StepBasis.tsx`)

- [ ] 5.1 BE-Slider durch Gramm-Slider ersetzen (z.B. 50–300g in 10er-Schritten)
- [ ] 5.2 Anzeige: "X g Brot pro Person" statt "X BE pro Person"
- [ ] 5.3 Verteilungs-Slider: Gramm-Anteile pro Sorte anzeigen (statt BE-Anteile)
- [ ] 5.4 Gramm + kcal pro Sorte anzeigen

## 6. Frontend — StepBelag (`StepBelag.tsx`)

- [ ] 6.1 BE-basierte Deckung durch Gramm-basiertes Verhältnis ersetzen
- [ ] 6.2 Doppelcheck Belag-Deckung: Gramm-Brot vs. Gramm-Belag vergleichen
- [ ] 6.3 Warnhinweis-Text anpassen: "Brot:Belag-Verhältnis unausgewogen" statt "X Brote unbelegt"
- [ ] 6.4 Intensität (knapp/normal/üppig) bleibt unverändert

## 7. Frontend — StepCockpit (`StepCockpit.tsx`)

- [ ] 7.1 Cockpit-Tabelle: Brot-Items zeigen `{gramm}g ({portionszahl} Scheibe)` statt `×{bePerPerson × sharePercent} Scheibe`
- [ ] 7.2 Belag-Items zeigen `{gramm}g ({portionszahl} Portion)` statt `×{bePerPerson × sharePercent/totalShare} Portion`
- [ ] 7.3 Summenzeilen: "Brote gesamt: {gramm}g" statt "×{sum} Scheibe"
- [ ] 7.4 Extras + warme Gerichte ins Energie-Ist einrechnen (bisher 0 kcal)
- [ ] 7.5 Ampel auf dreistufig umstellen (<80% rot, 80-110% grün, 110-120% gelb, >120% rot)
- [ ] 7.6 `handleNormalize()` auf `normalizeGrams()` umstellen
- [ ] 7.7 Alle BE-Referenzen aus dem JSX entfernen

## 8. Frontend — Rekonstruktion aus RefMeal (`refMealToWizardState.ts`)

- [ ] 8.1 Rekonstruktion von `bePerPerson` → `gramsPerPerson` umstellen
- [ ] 8.2 Gramm-Werte aus MealItem.quantity + measuring_unit ableiten
- [ ] 8.3 BE-Berechnung in der Rekonstruktionslogik entfernen

## 9. Frontend — BreakfastWizardPage + Settings

- [ ] 9.1 `BreakfastWizardPage.tsx`: `dayPartFactor` default auf 0.30 ändern (Zeile ~45: `existingRefMeal?.day_part_factor ?? 0.30`)
- [ ] 9.2 `SettingsPanel.tsx`: Breakfast default day_part_factor auf 0.30 ändern
- [ ] 9.3 Beide Änderungen propagieren: falls Prozentsatz im UI angezeigt wird, "30%" statt "25%" oder "20%"

## 10. Frontend — API-Hooks (`breakfast.ts`)

- [ ] 10.1 `useBreakfastLeftovers` prüfen: ob BE-bezogene Parameter übergeben werden — ggf. auf Gramm umstellen
- [ ] 10.2 Neuen Hook `useIngredientKcal` (oder ähnlich) für den neuen Backend-Endpoint aus Task 1 erstellen

## 11. Tests

- [ ] 11.1 Backend-Tests für `POST /api/meal-plans/{plan_id}/calculate-ingredient-kcal/`
- [ ] 11.2 Frontend-Tests für `breakfastCalc.ts` mit Gramm-Basis
- [ ] 11.3 Wizard-Durchlauftest: von Step 1 bis Cockpit ohne BE
- [ ] 11.4 Test: Normalisieren skaliert Brot+Belag korrekt
- [ ] 11.5 Test: Cockpit zeigt Gramm + natürliche Einheiten
- [ ] 11.6 Test: Ampel zeigt korrekte Farbe bei Unter-/Überdeckung
- [ ] 11.7 Test: Extras-Kcal fließen ins Energie-Ist
