## 1. Benchmark (Grundlage)

- [x] 1.1 `parse_recipe_html(html, url)` aus `import_from_url` herauslösen (`backend/recipe/services/import_service.py`)
- [x] 1.2 Management-Command `export_matching_catalog` und Katalog-Snapshot `backend/recipe/tests/fixtures/chefkoch_matching/catalog.json.gz`
- [x] 1.3 Zehn zufällige Chefkoch-Seiten gekürzt speichern, Gold-Labels `expected.py` (Salz und Pfeffer n. B. → je 1 Prise)
- [x] 1.4 Benchmark-Harness und `test_chefkoch_import_matching_e2e.py` mit Ratchet (Baseline 61/11/64/42 %)
- [x] 1.5 Zweiten Satz aus zehn zufälligen Seiten ziehen (Kontrollsatz, nicht für Regel-Tuning), Gold-Labels anlegen

## 2. Backend – Zeilen-Parser

- [x] 2.1 `backend/recipe/data/ingredient_line_vocabulary.py`: Einheiten inkl. Pluralformen, Mengenwörter, Größen, Spezifizierer, Zusätze, Gewürz-/Öl-/Kräuter-Kategorien
- [x] 2.2 `backend/recipe/services/ingredient_line.py`: `ParsedLine`, `parse_line` (Bereiche, ca., „Name: Menge“, Klammer/Komma-Klassifikation), Unit-Tests
- [x] 2.3 `parse_cells` und `_parse_chefkoch_table` in `import_service.py`; Tabelle vor JSON-LD für chefkoch.de, Import ohne JSON-LD; xfail im Benchmark entfernen
- [x] 2.4 `split_compound` für „X und Y“ mit Katalog-Prüfung; geteilte Zeilen behalten `source_line`
- [x] 2.5 „n. B.“-Defaults (Gewürz 1 Prise, Öl/Fett 1 EL, Kräuter 1 EL gehackt) mit `quantity_estimated`
- [x] 2.6 `ImportedIngredient.parsed` durch Pipeline reichen (`_merge_ingredient_sources`, `preview_recipe_ingredients`, URL-Import-Pfad); alte Normalisierung zusammenführen
- [x] 2.7 Benchmark laufen lassen, Ratchet anheben

## 3. Backend – Matcher

- [x] 3.1 Migration `supply`: `Ingredient.exclude_from_matching`; Kandidaten-Queryset filtert es
- [x] 3.2 `backend/recipe/services/matching_index.py`: Token-Normalisierung, Komposita-Zerlegung, Kopfnomen, Merkmalsgruppen/Konfliktwörter, Score, Cache mit Versionszähler und Signal-Invalidierung; Unit-Tests
- [x] 3.3 `IngredientMatcher` auf Stufenfolge D4 umbauen (pg_trgm/Levenshtein entfernen, Gleichstand → kanonischer Vorschlag); bestehende Matcher-Tests anpassen
- [x] 3.4 Migration + Model `LearnedIngredientMapping`; Schreiben in der finalen Review-Persistenz (`backend/recipe/api/items.py`), Lesen als Stufe 1; Tests inkl. anonym
- [x] 3.5 Embedding-Backfill: vorhandener Schritt `food_data_offensive --steps embeddings` (kein neuer Command); kein Embedding-Rerank pro Zeile (Kosten), offene Zeilen übernimmt der KI-Reranker (3.6)
- [x] 3.6 KI-Reranker pro Rezept (`gemini_call`, ein Call, nur angemeldet, `ai_reason`); Tests mit gepatchtem Gemini und `gemini_unavailable`
- [x] 3.7 Command `audit_ingredient_aliases` (Bericht, `--apply` entfernt gemeldete Aliase); Test
- [x] 3.8 Parität: Index ist reines Python (pg_trgm entfernt); Postgres-Testlauf lokal blockiert, da `pgvector` in neuen Test-DBs fehlt → in CI/Staging nachholen

## 4. Backend – Menge & Portion

- [x] 4.1 `_direct_portion_count`: Portionsname vor Maßeinheit; Tests für `1 TL (2g)` und `200 ml`-Portion mit Maßeinheit „Esslöffel“
- [x] 4.2 Command `fix_misassigned_spoon_units` (Dry-Run/`--apply`); Test
- [x] 4.3 Größenadjektive: passende Stückportion wählen bzw. skalieren; normale vor „kleiner“ Stückportion
- [x] 4.4 `backend/recipe/data/standard_unit_weights.py` + Nutzung vor Gemini; Prise 0,5 g
- [x] 4.5 Kategorie-Dichte für Zutaten ohne eigene Dichte
- [x] 4.6 Benchmark, Ratchet anheben

## 5. Backend – Zutat per Knopfdruck

- [ ] 5.1 Pydantic `IngredientDraftRequestIn`, `IngredientDraftOut` (Entwurf + `duplicates`); `IngredientReviewRowOut` um `quantity_estimated`, `source_line`, `ai_reason` erweitern
- [ ] 5.2 Service + Endpunkt `POST /api/recipes/ingredient-review/new-ingredient-draft/` (401 anonym, normalisierter Name, Anreicherung, Mengenumrechnung, Dubletten-Kandidaten); Tests Happy Path, 401, Gemini nicht verfügbar

## 6. Frontend (frontend-food)

- [ ] 6.1 Zod-Schemas in `src/schemas/ingredientReview.ts` synchronisieren
- [ ] 6.2 Mutation-Hook `useIngredientDraftMutation`
- [ ] 6.3 `RecipeIngredientReviewStep.tsx`: Button „Zutat anlegen“ in jeder unbestätigten Zeile, Dialog „Vorhandene Zutat verwenden?“, Badge „geschätzt“, Originalzeile bei geteilten Zeilen, KI-Begründung
- [ ] 6.4 Vitest für Button, Dubletten-Hinweis und Badge; Typecheck und Lint

## 7. Daten & Abschluss

- [ ] 7.1 Command `split_combined_seasoning_items` (Rezeptzeilen „Salz und Pfeffer“ → je 1 Prise Jodsalz + gemahlener schwarzer Pfeffer, danach soft-delete + `exclude_from_matching`), Dry-Run-Bericht; Test
- [x] 7.2 Kontrollsatz (1.5) einmal messen und im Bericht festhalten
- [ ] 7.3 Ziel-Ratchet erreicht: Zutat ≥ 90 %, falsch ≤ 3 %, Menge ≥ 85 %, ohne Nacharbeit ≥ 75 %
- [ ] 7.4 `uv run python manage.py makemigrations --check`, `uv run pytest`, Frontend-Tests; Change `import-ingredient-name-normalization` als aufgegangen markieren
- [ ] 7.5 Prod-Schritte (Audit, Löffel-Fix, Salz/Pfeffer-Split, Embedding-Backfill) in den gebündelten Rollout eintragen: Dry-Run zuerst, `--apply` nur nach OK
