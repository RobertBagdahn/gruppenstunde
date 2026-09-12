## 1. Backend: Invarianten für Gramm- & Milliliter-Portionen

- [x] 1.1 In `backend/recipe/services/url_import_service.py` (`_resolve_portion` und `_should_update_weight`) absichern, dass Messeinheiten für Masse (`g`, `Gramm`, `kg`) und Volumen (`ml`, `Milliliter`, `l`, `Liter`) niemals durch geschätzte Portionsgewichte überschrieben werden und keine künstlichen Portionen wie `"g (100 g)"` angelegt werden.
- [x] 1.2 Regressionstests in `backend/recipe/tests/test_url_import_portion_resolution.py` hinzufügen: Sicherstellen, dass für Gramm- und Milliliter-Eingaben immer Portionen mit `weight_g == 1.0` (oder `None`) resultieren und niemals 100g.

## 2. Backend: Zutaten-Parser & Einheiten-Mapping

- [x] 2.1 In `backend/recipe/services/ingredient_parser.py` (`_split_name_note`) Plural-Klammern wie `(n)`, `(s)`, `(en)`, `(r)` erkennen und aus dem Zutatennamen entfernen, ohne dass der Buchstabe als Zubereitungsnotiz im Notizfeld landet.
- [x] 2.2 In `UNIT_CANONICAL` und Einheiten-Mapping `Zehe` / `Zehen` (sowie ggf. `Dose(n)`, `Pck.`) als gültige Einheiten hinterlegen, damit Zehen nicht auf Gramm zurückfallen.
- [x] 2.3 Unit-Tests in `backend/recipe/tests/test_ingredient_parser.py` erweitern für `Möhre(n)`, `Kartoffel(n)`, `Zwiebel(n)`, `2 Zehen Knoblauch`.

## 3. Backend: Duplikats-Prävention & Smart-Input Prompting

- [x] 3.1 In `backend/recipe/services/ingredient_matcher.py` anpassen: Wenn exakte Treffer (Confidence 1.0) oder identische Namen existieren, nicht `needs_review=True` auslösen, sondern die etablierte Zutat auswählen.
- [x] 3.2 In `backend/recipe/services/url_import_service.py` und `recipe_ai_suggest_service.py` verhindern, dass bei mehrdeutigen Suchergebnissen blind neue Draft-Zutaten in die Datenbank geschrieben werden.
- [x] 3.3 Prompting in `extract_smart_recipe_input` verfeinern: Bei reinen Zutatenlisten (ohne Zubereitungstext) strikt anweisen, keine weiteren Zutaten (wie Petersilie) zu erfinden.
- [x] 3.4 Integrationstests in `backend/recipe/tests/test_url_import_smart_input.py` ergänzen.

## 4. Frontend: InlineIngredientEditor Mengen- und Einheitenanzeige

- [x] 4.1 In `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` (`normalizeItems`) beheben, dass Portions-Einheiten (Esslöffel, Teelöffel, Stück, Prise) mit ihrem Grammgewicht im Inputfeld dargestellt werden. Die Eingabe muss die Anzahl der Einheiten (z. B. `1` bei 1 EL) darstellen.
- [x] 4.2 Speicherlogik (`performSave`) im `InlineIngredientEditor.tsx` überprüfen und sicherstellen, dass die Einheiten-Multiplikatoren korrekt an das Backend übermittelt werden.
- [x] 4.3 Frontend-Unit-Tests in `frontend-food/src/components/recipe/__tests__/InlineIngredientEditor.normalizeItems.test.ts` und `savePath.test.ts` anpassen und neue Tests für Löffel- und Stück-Einheiten hinzufügen.

## 5. End-to-End Verifikation & Qualitätssicherung

- [x] 5.1 Backend-Tests ausführen: `uv run pytest recipe/tests/` und `uv run python manage.py makemigrations --check`.
- [x] 5.2 Frontend-Tests ausführen: `npm test` in `frontend-food`.
- [x] 5.3 Test-Rezept mit dem ursprünglichen Text (100g Lauch, 1 EL Butter, 3 EL Balsamico, Möhre(n), Kartoffel(n)) durch die Parsing-Pipeline laufen lassen und korrekte Mengen verifizieren.
