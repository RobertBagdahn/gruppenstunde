## 1. Anzeige-Logik

- [x] 1.1 Mengen-/Einheiten-Helfer aus `components/supply/IngredientList.tsx` nach `lib/ingredientAmount.ts` extrahieren (Verhalten unverändert) und `formatRecipeItemAmount` ergänzen
- [x] 1.2 `RecipeIngredientsTable.tsx` auf den Formatter umstellen, Rückfall „Gramm“ entfernen, „—“ bei fehlender Einheit
- [x] 1.3 Vorschau-Beschriftung „pro Person“ in `WizardStepPreview.tsx`

## 2. Tests

- [x] 2.1 Komponententests mit den Produktivtest-Fällen (Spaghetti, Zwiebel, Olivenöl, Salz) und Item ohne Portion/Einheit
- [x] 2.2 Bestehende Tests der Detailseite und des Wizards (`RecipeWizard.test.tsx`, `RecipeWizardFlow.test.tsx`) laufen unverändert

## 3. Abschluss

- [x] 3.1 Frontend-Typecheck, Lint, Tests
- [ ] 3.2 Manuell: Freitext-Rezept bis zur Vorschau, Vergleich mit Detailseite nach „Fertigstellen“, 320 px Breite prüfen
