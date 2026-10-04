## 1. Backend: Mengenumrechnung

- [x] 1.1 In `UnitGramConverter.convert_to_portion_count` Direktabgleich Einheit ↔ aktive Portion (Name/Messeinheit, Plural normalisiert, vertrauenswürdiges Gewicht) vor der Gramm-Umrechnung ergänzen
- [x] 1.2 Sonderfall leere Einheit/„Stück“ mit Stückportion
- [x] 1.3 Tests: 2 EL Olivenöl → 2, 1 Zwiebel → 1, Prise Salz, g und Dose unverändert, Portion ohne Gewicht überspringt Direktabgleich
- [x] 1.4 `_suggested_portion_count` in `ingredient_review_service.py` gegen die neuen Fälle über `preview_recipe_ingredients` testen

## 2. Frontend: Review-Schritt (frontend-food)

- [x] 2.1 `focusSearch` in `RecipeIngredientReviewStep.tsx`: nach `focus()` Text markieren
- [x] 2.2 `selectIngredient`: `new_ingredient_draft` löschen, Formular ausblenden
- [x] 2.3 `IngredientAutocomplete.tsx`: Chip-Reihe mit Umbruch oder Scroll im Container, kein Überlauf ab 320 px
- [x] 2.4 Komponententests: Ersetzen statt Anhängen, Alternative räumt Formular, bewusste Neuanlage behält es

## 3. Frontend: Schritte-Hinweis

- [x] 3.1 Merker `ingredientsChangedSinceImport` im Review-Store (setzt sich bei Entfernen, Hinzufügen, Ersetzen)
- [x] 3.2 Hinweis `StaleStepsNotice` im Schritt „Zubereitung“ mit Quittierung und Verweis auf die KI-Generierung
- [x] 3.3 Test: Hinweis nach Entfernen, kein Hinweis bei reiner Mengenänderung

## 4. Abschluss

- [x] 4.1 `uv run pytest backend/recipe`, Frontend-Typecheck, Lint, Tests
- [ ] 4.2 Manuell: Freitext-Rezept aus dem Produktivtest erneut durchspielen (Zwiebel, Olivenöl, Zutat ändern, Alternative wählen, Schritte-Hinweis)
