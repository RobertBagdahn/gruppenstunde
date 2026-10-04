## 1. Backend

- [x] 1.1 Helfer `validate_ingredient_nutrition(values, name, partial_update)` in `backend/supply/services/nutrition_plausibility.py`, der harte Befunde (`invalid_value`, `macro_sum_gt_100`, `sugar_gt_carbs`, `sat_fat_gt_fat`) von Warnungen trennt
- [x] 1.2 In `create_ingredient` und `update_ingredient` aufrufen (Update: Payload über Bestand legen, nur wenn Nährwertfelder im Payload), bei hartem Befund `HttpError(422)` mit `detail` und `fields`
- [x] 1.3 `nutrition_warnings` im Ingredient-Out-Schema (Pydantic) ergänzen
- [x] 1.4 Tests: 200 g Eiweiß abgelehnt, Zucker > Kohlenhydrate abgelehnt, plausibel gespeichert, Warnung bei Energie-Abweichung, Preisänderung an Bestandszutat nicht blockiert, Teilupdate gegen Bestand

## 2. Frontend (frontend-food)

- [x] 2.1 Zod-Schema für Nährwerte mit harten Regeln, synchron zu Pydantic, `nutrition_warnings` ergänzen
- [x] 2.2 `IngredientEditPage.tsx`: Feldfehler inline, 422-`fields` den Feldern zuordnen, Warnungen nach dem Speichern anzeigen (`CreateIngredientPage.tsx` hat keine Nährwertfelder; dessen Fehlermeldung folgt in `food-ui-polish-prod-test`)
- [x] 2.3 Dialog „Neue Zutat prüfen“ im Rezept-Wizard auf dieselbe Prüfung umstellen
- [x] 2.4 Tests für Zod-Regeln und Fehlerzuordnung, gemeinsame Beispielfälle wie im Backend

## 3. Abschluss

- [x] 3.1 `uv run pytest backend/supply`, Frontend-Typecheck, Lint und Tests
- [ ] 3.2 Manuell prüfen: Eiweiß 200 wird abgelehnt, Energie-Abweichung warnt, mobil ab 320 px
