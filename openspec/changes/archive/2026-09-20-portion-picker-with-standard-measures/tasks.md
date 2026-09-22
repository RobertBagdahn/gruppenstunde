## 1. Backend: Save-Integrity

- [x] 1.1 `backend/recipe/api/items.py` → `update_recipe_item`: nach dem bestehenden `quantity is None`-Guard zusätzlich `quantity <= 0` mit `HttpError(422, "Menge muss größer als 0 sein.")` ablehnen
- [x] 1.2 Tests in `backend/recipe/tests/`: PATCH mit `quantity: 0` und `-3` → 422 (kein 500), `quantity: null` → unverändert gespeichert, gültige Menge → 200
- [x] 1.3 Prüfen, dass Pydantic v2 NaN im JSON bereits mit 422 ablehnt; ggf. Test ergänzen

## 2. Backend: Standardmengen-Katalog

- [x] 2.1 `backend/supply/data/standard_measures.py` anlegen: EL (15 ml), TL (5 ml), Tasse (200 ml), Prise (0,5 g), Msp (0,2 g)
- [x] 2.2 Pydantic-Schema `StandardMeasureOut` (key, name, grams, unit_name, is_approx) in `backend/supply/schemas/ingredients.py`
- [x] 2.3 Endpoint `GET /api/ingredients/{slug}/standard-measures/` in `backend/supply/api/ingredients.py` (vor parametrisierten Routen registrieren); Gramm = Volumen × `physical_density` wenn vorhanden, sonst generisch mit `is_approx=true`; 404 bei unbekanntem Slug
- [x] 2.4 Tests: Zutat mit/ohne Dichte, unbekannter Slug (404), anonymer Zugriff (200)

## 3. Frontend: Zod-Schema und Katalog-Hook

- [x] 3.1 Zod-Schema für `StandardMeasureOut` in `frontend-food/src/schemas/supply.ts` (synchron zu Pydantic)
- [x] 3.2 TanStack-Query-Hook (z. B. `useStandardMeasures(ingredientSlug)`) in `frontend-food/src/api/`
- [x] 3.3 Schema-Sync-Test nach vorhandenem Muster (`contractSchemas`) ergänzen

## 4. Frontend: PortionPicker-Komponente

- [x] 4.1 Neue Komponente `frontend-food/src/components/recipe/PortionPicker.tsx` (Radix-Popover-Muster wie `IngredientAssignmentDropdown`, ohne Suche, mobile-fähig ab 320px)
- [x] 4.2 Abschnitte "Zutat" / "Standardmengen" / "Gramm"; Zeile: Name (Fallback `measuring_unit_name` bzw. "Gramm") + Gewicht (`formatGramsShort`), Kennzeichnung "Gewicht fehlt" bei ungewichtetem Eintrag
- [x] 4.3 Auswahllogik: Zutat-Portion → `onSelect(portionId)`; Standardmenge → `g`-Fallback-Portion bzw. `portion_id: null` + Gramm-Menge; Gramm → wie Standardmenge mit freier Eingabe
- [x] 4.4 Tests: Sortierung nach rank, Fallback-Labels, "Gewicht fehlt" bei untrusted, onSelect-Callback

## 5. Frontend: Editor-Integration und Guards

- [x] 5.1 `InlineIngredientEditor.tsx`: natives `<select>` in `IngredientRow` durch `PortionPicker` ersetzen (auch bei nur einer Portion: Trigger mit Name + Gewicht)
- [x] 5.2 `handlePortionChange`: bei `currentGrams <= 0` bzw. nicht-endlich Fallback-Menge 1 (metrische Direktportion → deren Gramm, sonst 1)
- [x] 5.3 `toPersistedRecipeItemQuantity`: Guard gegen nicht-endliche/≤ 0-Ergebnisse → Fallback 1 senden (reguläre Eingaben unverändert)
- [x] 5.4 `IngredientQuantityDialog.tsx`: shadcn `Select` durch `PortionPicker` ersetzen (wirkt über `IngredientDetailSearchDialog` und Wizard)
- [x] 5.5 Anzeige: in der Gewichtsspalte der Zeile "Gewicht unbekannt" mit Warn-Icon statt "= 0 g"; bestehenden Hinweis "Gewicht bestätigen" erhalten
- [x] 5.6 Tests aktualisieren/ergänzen: existierende Suite (`InlineIngredientEditor.portionLabels.test.ts`, `StepEditor`/Dialog-Tests) anpassen; Guard-Unit-Tests für 5.2/5.3

## 6. Verifikation und Deploy

- [x] 6.1 `uv run pytest backend/recipe backend/supply` und frontend-food-Tests (`vitest`/lint) ausführen — alles grün (2 vorbestehend rote AI-Mock-Tests in `test_steps_ai_service.py`, unabhängig vom Change)
- [x] 6.2 `uv run python manage.py makemigrations --check` (erwartet: keine Änderungen)
- [x] 6.3 Backend (`inspi-backend`) und food-Frontend (`inspi-frontend-food`) per Deploy-Skill deployen (Cloud Build, `--image` + `--region`, danach `gcloud run services update-traffic --to-latest`)
- [x] 6.4 Produktiv prüfen: Zwiebel-Portion in "Nudeln mit Tomatensoße" wechseln und speichern (kein 500, Menge korrekt)

## 7. Follow-up: Stück-Portionen zählen (1 = 1 Stück)

- [x] 7.1 Backend: `PortionOut.is_piece_like` (via `is_piece_like_name`) in `supply/schemas/ingredients.py` + im Diet-Weg von `recipe/schemas/items.py` (`resolve_ingredient_portions`); Tests in `test_contract_schemas.py` und `test_api.py`
- [x] 7.2 Frontend: `is_piece_like` im Zod-`PortionSchema` und `EditableItem`; `isDirectMetricPortion`/`portionDisplayLabel` piece-aware; alle Add-Flows zählen piece-like Portionen als Anzahl
- [x] 7.3 Guard-Tests erweitert (Zwiebel-Repro: 1 × "kleine (50g)" = 50 g, Gramm-Erhalt bei bekanntem Gewicht)
- [x] 7.4 Caching-Fix: nginx liefert `index.html` mit `cache-control: no-cache`; Backend (00064) + Frontend (00058) deployed, vom Nutzer verifiziert
