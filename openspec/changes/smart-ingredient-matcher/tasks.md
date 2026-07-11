## 1. Datenmodell & Migration

- [ ] 1.1 `usage_count`-Feld zu `Ingredient`-Model hinzufügen (IntegerField, default=0)
- [ ] 1.2 Daten-Migration schreiben: `usage_count` aus RecipeItems berechnen und befüllen
- [ ] 1.3 Migration ausführen: `uv run python manage.py makemigrations && uv run python manage.py migrate`

## 2. Name/Note Parser

- [ ] 2.1 Modifikator-Listen definieren (state, color, size, prep) als Konstanten in neuem Parser-Modul
- [ ] 2.2 `IngredientNameParser.parse()` implementieren — rule-based: bekannte Modifikatoren erkennen und aus Namen entfernen
- [ ] 2.3 Jaccard-Fallback im Parser: Wort-Jaccard gegen bekannte Ingredient-Namen, wenn rule-based kein Match findet
- [ ] 2.4 Gemini-Fallback im Parser: rohen String an Gemini für name/note-Split übergeben
- [ ] 2.5 `ParsedIngredient`-Pydantic-Schema definieren: quantity, unit, name, note, confidence
- [ ] 2.6 Tests für Parser schreiben (alle Szenarien aus spec)

## 3. Gemini Enrichment Service

- [ ] 3.1 `GeminiNewIngredient`-Schema aus `url_import_service.py` in `recipe/schemas/` extrahieren (wiederverwendbar)
- [ ] 3.2 `enrich_ingredient(name, user)`-Funktion in `recipe/services/ingredient_enrichment.py` erstellen
- [ ] 3.3 Gemini-Prompt für Nährwert-Anreicherung aus `url_import_service._call_gemini_for_matching()` extrahieren
- [ ] 3.4 Error-Handling: GeminiUnavailableError → return None (graceful degradation)
- [ ] 3.5 Tests für enrich_ingredient schreiben (Erfolg + Gemini nicht verfügbar)

## 4. IngredientMatcher Service (Kern)

- [ ] 4.1 `MatchResult`-Pydantic-Schema definieren: ingredient_id, name, confidence, matched_via (jaccard|fuzzy|embed|gemini|new), note, needs_review
- [ ] 4.2 `IngredientMatcher.match()` Grundgerüst erstellen (cascading loop durch Stages)
- [ ] 4.3 Stage 1: Wort-Jaccard implementieren (Tokenize → Jaccard → Threshold 0.90)
- [ ] 4.4 Stage 2: pg_trgm + Levenshtein implementieren (gewichteter Score, Threshold 0.70)
- [ ] 4.5 Stage 3: Embedding implementieren (pgvector CosineDistance, Threshold 0.50)
- [ ] 4.6 Stage 4: Neues Ingredient anlegen (DRAFT) + enrich_ingredient() aufrufen
- [ ] 4.7 Popularitäts-Sortierung: Kandidaten nach usage_count DESC ordnen vor Scoring
- [ ] 4.8 Thresholds als Django Settings konfigurierbar machen
- [ ] 4.9 Tests für IngredientMatcher schreiben (alle Stages + Cascading + New Ingredient)

## 5. Embedding-Text erweitern

- [ ] 5.1 `build_ingredient_embedding_text()` in `content/services/embedding_service.py` erweitern: aliases + group_names hinzufügen
- [ ] 5.2 Background-Job / Management Command für batch_update_embeddings (optional)

## 6. Flow C umstellen: AI-Suggest-Ingredients

- [ ] 6.1 `ai_ingredients_service.RecipeAiIngredientsService.match_ingredients()` durch `IngredientMatcher.match()` ersetzen
- [ ] 6.2 `_create_new_ingredients()`-Logik in Flow C entfernen (wird vom Matcher übernommen)
- [ ] 6.3 Tests für Flow C aktualisieren

## 7. Flow B umstellen: AI-Create-Recipe

- [ ] 7.1 `recipe_ai_suggest_service._match_or_create_ingredient()` durch `IngredientMatcher.match()` ersetzen
- [ ] 7.2 `_match_measuring_unit()` und `_resolve_or_create_portion()` bleiben (separate Logik)
- [ ] 7.3 Tests für Flow B aktualisieren

## 8. Flow A umstellen: URL-Import (Gemini-Teil)

- [ ] 8.1 `url_import_service._create_new_ingredients()` durch `IngredientMatcher.match()` ersetzen für den Ingredient-Teil
- [ ] 8.2 Gemini-Call in `_call_gemini_for_matching()` entschlacken: Gemini matched NICHT mehr Ingredients, nur noch Recipe-Metadaten (title, description, steps, tags, scout_levels)
- [ ] 8.3 Tests für Flow A aktualisieren

## 9. Frontend: Unsicherheits-Dialog

- [ ] 9.1 Bestehenden `UnknownIngredientDialog` erweitern: bei `needs_review=true` anzeigen
- [ ] 9.2 Dialog-Optionen: "Ingredient auswählen" (Suche) oder "trotzdem neu anlegen"
- [ ] 9.3 Zod-Schema für MatchResult erstellen (synchron zu Pydantic)
- [ ] 9.4 API-Hooks aktualisieren (falls Response-Schema sich ändert)

## 10. Alte Matching-Funktionen deprecated markieren

- [ ] 10.1 `_match_or_create_ingredient()` mit `@deprecated`-Dekorator versehen
- [ ] 10.2 `_get_ingredient_candidates()` in url_import_service als deprecated markieren
- [ ] 10.3 `match_ingredients()` in ai_ingredients_service als deprecated markieren
