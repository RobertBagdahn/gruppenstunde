## 1. Datenmodell & Migration

- [x] 1.1 `usage_count`-Feld zu `Ingredient`-Model hinzufügen (IntegerField, default=0)
- [x] 1.2 Daten-Migration schreiben: `usage_count` via JOIN über `supply_portion` berechnen und befüllen
- [x] 1.3 Migration ausführen: `uv run python manage.py makemigrations && uv run python manage.py migrate`
- [x] 1.4 Django Signals für `usage_count`: `post_save`/`post_delete` auf `RecipeItem` und `Portion` aktualisieren `usage_count` via `F('usage_count') +/- 1`

## 2. Name/Note Parser

- [x] 2.1 Modifikator-Listen definieren (state, color, size, prep) als Konstanten in neuem Parser-Modul
- [x] 2.2 `IngredientNameParser.parse()` implementieren — rule-based: quantity/unit-Patterns (200g, 2 Stück, 1 EL) + Modifikatoren erkennen und aus Namen entfernen; Suche gegen `Ingredient.name` UND `IngredientAlias.name`
- [x] 2.3 Jaccard-Fallback im Parser: Wort-Jaccard gegen bekannte Ingredient-Namen + Aliase, wenn rule-based kein Match findet
- [x] 2.4 Gemini-Fallback im Parser: rohen String an Gemini für vollständiges Parsing (quantity + unit + name + note)
- [x] 2.5 `ParsedIngredient`-Pydantic-Schema definieren: quantity (float, default=0), unit (str, default=""), name (str), note (str, default=""), confidence (float)
- [x] 2.6 Tests für Parser schreiben (alle Szenarien aus spec: quantity/unit, modifier parsing, cascading)

## 3. Gemini Enrichment Service

- [x] 3.1 `GeminiNewIngredient`-Schema aus `url_import_service.py` in `recipe/schemas/` extrahieren (wiederverwendbar)
- [x] 3.2 `enrich_ingredient(name, user)`-Funktion in `recipe/services/ingredient_enrichment.py` erstellen (synchron)
- [x] 3.3 Gemini-Prompt für Nährwert-Anreicherung aus `url_import_service._call_gemini_for_matching()` extrahieren; Prompt anpassen: `new_ingredient.name` OHNE Zustandsform
- [x] 3.4 Error-Handling: GeminiUnavailableError → return None (graceful degradation, DRAFT ohne Nährwerte)
- [x] 3.5 Tests für enrich_ingredient schreiben (Erfolg + Gemini nicht verfügbar)

## 4. IngredientMatcher Service (Kern)

- [x] 4.0 Parser als Pre-Processing in `IngredientMatcher.match()` einbauen: raw string → `parse()` → `match()` mit bereinigtem Namen
- [x] 4.1 `MatchResult`-Pydantic-Schema definieren: ingredient_id, name, confidence, matched_via (jaccard|fuzzy|embed|gemini|new), note, is_new, needs_review, candidates (List[dict] für HITL)
- [x] 4.2 `IngredientMatcher` als Django Service-Klasse mit `@classmethod`-Methoden erstellen (stateless)
- [x] 4.3 Stage 1: Wort-Jaccard implementieren (Tokenize → Jaccard → Threshold 0.90); Durchsucht `Ingredient.name` + `IngredientAlias.name`
- [x] 4.4 Stage 2: pg_trgm + Levenshtein implementieren (gewichteter Score: 0.6×pg_trgm + 0.4×(1−levenshtein/max_len), Threshold 0.70); Durchsucht Aliase
- [x] 4.5 Stage 3: Embedding implementieren (pgvector CosineDistance über ALLE Ingredients, Threshold 0.50)
- [x] 4.6 Stage 4: `needs_review=true` zurückgeben → Frontend öffnet bestehenden Zutaten-Suchdialog; User sucht oder legt neu an; bei "neu anlegen": DRAFT-Ingredient + `enrich_ingredient()` synchron
- [x] 4.7 HITL Grey-Zone-Logik: wenn confidence in [0.3, stage_threshold) oder mehrere Kandidaten (Score-Differenz < 0.05) → Top-5 Kandidaten in `candidates` zurückgeben
- [x] 4.8 Popularitäts-Sortierung: Kandidaten nach `usage_count` DESC ordnen vor Scoring
- [x] 4.9 Thresholds als Django Settings konfigurierbar machen
- [x] 4.10 Tests für IngredientMatcher schreiben (alle Stages + Cascading + Grey-Zone + HITL + New Ingredient)

## 5. Embedding-Text erweitern

- [x] 5.1 `build_ingredient_embedding_text()` in `content/services/embedding_service.py` erweitern: aliases (komma-getrennt) + group_names (komma-getrennt) hinzufügen
- [x] 5.2 Batch-Update aller Ingredient-Embeddings: `uv run python manage.py batch_update_embeddings --force --content-type ingredient`

## 6. Flow C umstellen: AI-Suggest-Ingredients

- [x] 6.1 `ai_ingredients_service.RecipeAiIngredientsService.match_ingredients()` durch `IngredientMatcher.match()` ersetzen
- [x] 6.2 `_create_new_ingredients()`-Logik in Flow C entfernen (wird vom Matcher übernommen)
- [x] 6.3 `RecipeItem.note` aus `MatchResult.note` befüllen bei Item-Erstellung
- [x] 6.4 Tests für Flow C aktualisieren

## 7. Flow B umstellen: AI-Create-Recipe

- [x] 7.1 `recipe_ai_suggest_service._match_or_create_ingredient()` durch `IngredientMatcher.match()` ersetzen
- [x] 7.2 `_match_measuring_unit()` und `_resolve_or_create_portion()` bleiben; Portions erhalten `weight_g` aus `enrich_ingredient().portion_weight_g` falls verfügbar
- [x] 7.3 `RecipeItem.note` aus `MatchResult.note` befüllen
- [x] 7.4 Tests für Flow B aktualisieren

## 8. Flow A umstellen: URL-Import (1 Gemini-Call)

- [x] 8.1 `url_import_service._create_new_ingredients()` durch `IngredientMatcher.match()` ersetzen für den Ingredient-Teil
- [x] 8.2 Gemini-Call in `_call_gemini_for_matching()` entschlacken: Gemini matched NICHT mehr Ingredients, nur noch Recipe-Metadaten + quantity/unit-Parsing (1 Call)
- [x] 8.3 `GeminiIngredientMatch`-Schema anpassen: `note`-Feld entfernen (kommt vom Parser), `new_ingredient`-Feld entfernen (kommt von enrich())
- [x] 8.4 `_build_recipe_items()`: Note aus `MatchResult.note` statt aus Gemini-Response befüllen
- [x] 8.5 Tests für Flow A aktualisieren

## 9. Frontend: HITL-Integration

- [x] 9.1 Bestehenden Zutaten-Suchdialog (aus Recipe-Editor) für `needs_review=true`-Fälle wiederverwenden
- [x] 9.2 Top-5-Kandidaten aus `MatchResult.candidates` als Vorauswahl im Dialog anzeigen
- [x] 9.3 Zod-Schema für `MatchResult` (inkl. candidates) erstellen — synchron zu Pydantic
- [x] 9.4 API-Hooks in allen drei Flows auf neue MatchResult-Struktur aktualisieren

## 10. Alte Matching-Funktionen entfernen

- [x] 10.1 `_match_or_create_ingredient()` in `recipe_ai_suggest_service.py` entfernen
- [x] 10.2 `_get_ingredient_candidates()` in `url_import_service.py` entfernen
- [x] 10.3 `match_ingredients()` in `ai_ingredients_service.py` entfernen
