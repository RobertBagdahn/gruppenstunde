## 1. Infrastructure — CloudSQL Extensions

- [ ] 1.1 `terraform/main.tf`: Auskommentiertes `database_flags`-Block mit `cloudsql.enable_pgvector` (Zeilen 150-153) komplett entfernen
- [ ] 1.2 Neue Migration in `content/migrations/`: `RunSQL` für `CREATE EXTENSION IF NOT EXISTS google_ml_integration VERSION '1.2'` + `GRANT EXECUTE ON FUNCTION embedding TO inspi` (in `content`-App wie die bestehende `0003_pgvector_extension.py`)
- [ ] 1.3 Nach Deployment: Verifizieren dass beide Extensions aktiv sind (`\dx` in psql → `google_ml_integration` + `vector`)

## 2. Infrastructure — IVFFlat → HNSW Index-Migration

- [ ] 2.1 Neue Migration in `content/migrations/` mit `atomic = False`: Erst alle 5 IVFFlat-Indizes droppen, dann `CREATE INDEX CONCURRENTLY` für Ingredient-und Recipe-HNSW-Indizes (Blog, Session, Game bekommen vorerst keine neuen Indizes)
- [ ] 2.2 Reverse-SQL: HNSW-Indizes droppen, IVFFlat-Indizes mit `IF NOT EXISTS` wiederherstellen
- [ ] 2.3 Lokal testen: Migration mit `uv run python manage.py migrate` ausführen, prüfen dass `\di` die neuen HNSW-Indizes zeigt

## 3. Backend — Embedding Text Builder

- [ ] 3.1 `content/services/embedding_service.py`: `build_ingredient_embedding_text()` umschreiben — menschenlesbare Vollfeld-Serialisierung aller 30+ Felder (Nährwerte, Scores, Preis, Lagerung, Saison, Tags, etc.) statt nur Name+Description+Tags+RetailSection
- [ ] 3.2 `content/services/embedding_service.py`: Neue Funktion `build_recipe_embedding_text(recipe)` — title, summary, description, tags, recipe_type, servings PLUS alle Ingredients via RecipeItems → Portions → Ingredients mit Nährwerten (pro Ingredient max 150 Zeichen)
- [ ] 3.3 `content/services/embedding_service.py`: `update_content_embedding()` erweitern — Recipe-Instanzen erkennen und an `build_recipe_embedding_text` delegieren (statt generischen `build_embedding_text`)

## 4. Backend — Embedding-Generierung via Cloud SQL `embedding()` SQL-Funktion

- [ ] 4.1 `content/services/embedding_service.py`: `create_embedding()` umbauen — `cursor.execute("SELECT embedding(%s, %s)", [model_id, text])` mit `fetchone()` statt `gemini_embed()`-Aufruf
- [ ] 4.2 `content/services/embedding_service.py`: Fallback-Logik für lokale Entwicklung — try/except auf `google_ml_integration` Extension; falls nicht verfügbar, alten Python Vertex AI SDK-Code als Fallback nutzen
- [ ] 4.3 `core/services/gemini.py`: Prüfen ob `gemini_embed` noch andere Aufrufer hat; falls nicht als Embedding-Zweck markieren

## 5. Backend — Recipe Embedding Auto-Trigger (Signal)

- [ ] 5.1 `recipe/signals.py`: Neuer `post_save`-Signal auf `Recipe` — nach Transaction-Commit async Thread starten der `update_content_embedding(instance)` aufruft (Muster: `supply/signals.py:61-92`)
- [ ] 5.2 `recipe/signals.py`: `_recipe_embedding_fields_changed()` — prüft ob `title`, `summary`, `description` geändert wurden
- [ ] 5.3 `recipe/signals.py`: Re-entrancy-Guard via `_updating_embedding`-Flag (wie bei Ingredient-Signal)

## 6. Backend — RecipeItem Change → Recipe Embedding Invaliderung

- [ ] 6.1 `recipe/signals.py`: Signal-Handler für `post_save` und `post_delete` auf `RecipeItem` — löst async `update_content_embedding(recipe)` für das zugehörige Recipe aus
- [ ] 6.2 Prüfen: `transaction.on_commit` verwenden (nicht direkt im Signal, um race conditions mit der Transaktion zu vermeiden)

## 7. Backend — Pydantic Schemas

- [ ] 7.1 `supply/schemas/ingredients.py`: Neues `IngredientSimilarOut`-Schema mit `id: int`, `name: str`, `slug: str`, `distance: float`
- [ ] 7.2 `recipe/schemas/recipes.py`: `RecipeSimilarOut`-Schema — altes tag-basiertes Schema durch neues mit `id: int`, `title: str`, `slug: str`, `distance: float` ersetzen

## 8. Backend — API Endpoints

- [ ] 8.1 `supply/api/ingredients.py`: Neuer Endpoint `GET /api/ingredients/{slug}/similar/?limit=10` → `list[IngredientSimilarOut]`, delegiert an `find_similar_ingredients()`
- [ ] 8.2 `recipe/api/recipes.py`: `get_similar_recipes` umschreiben — von Tag-basiertem Matching auf `find_similar_recipes()` (pgvector CosineDistance) umstellen. Route bleibt `GET /api/recipes/{recipe_id}/similar/`

## 9. Backend — Signal-Anpassung (Ingredient)

- [ ] 9.1 `supply/signals.py`: `_embedding_fields_changed()` erweitern — alle embedding-relevanten Felder tracken (Nährwerte, Scores, Preis, Lagerung, etc.), sodass z.B. Nährwert-Änderungen ein neues Embedding triggern

## 10. Backend — Embedding-Regenerierung

- [ ] 10.1 Nach Deployment: `batch_update_embeddings(content_type="ingredient", force=True)` und `batch_update_embeddings(content_type="recipe", force=True)` ausführen, um alle bestehenden Embeddings mit dem neuen Textformat neu zu generieren

## 11. Frontend — Zod Schemas

- [ ] 11.1 `frontend-food/`: Zod-Schema für `IngredientSimilarOut` (id, name, slug, distance)
- [ ] 11.2 `frontend-food/`: Zod-Schema `RecipeSimilarOut` von altem tag-basierten Format auf `{id, title, slug, distance}` umstellen

## 12. Frontend — API Hooks (TanStack Query)

- [ ] 12.1 `frontend-food/`: `useIngredientSimilar(slug, limit)` Hook für `GET /api/ingredients/{slug}/similar/`
- [ ] 12.2 `frontend-food/`: `useRecipeSimilar(id)` Hook aktualisieren — Response-Typ auf neues `RecipeSimilarOut`-Schema anpassen

## 13. Tests

- [ ] 13.1 `backend/supply/tests/`: Test für `build_ingredient_embedding_text` — verifiziert dass alle Felder im Text erscheinen
- [ ] 13.2 `backend/recipe/tests/`: Test für `build_recipe_embedding_text` — verifiziert dass Zutaten-Namen und Nährwerte im Text erscheinen, Text-Limit pro Zutat eingehalten wird
- [ ] 13.3 `backend/supply/tests/`: Test für `GET /api/ingredients/{slug}/similar/` — Happy Path, kein Embedding, 404
- [ ] 13.4 `backend/recipe/tests/`: Test für `GET /api/recipes/{id}/similar/` — Embedding-basierte Ergebnisse, kein Embedding
- [ ] 13.5 `backend/content/tests/`: Test für `create_embedding()` — SQL-Funktion-Fallback auf Python SDK in Test-Umgebung (SQLite)
- [ ] 13.6 `backend/recipe/tests/`: Test für Recipe-Embedding-Signal — verify dass post_save Embedding async triggert
- [ ] 13.7 `backend/recipe/tests/`: Test für RecipeItem → Recipe-Embedding-Invaliderung — verify dass add/delete RecipeItem Embedding-Update triggert

## 14. Schema-Sync & QA

- [ ] 14.1 Pydantic ↔ Zod Schema-Sync verifizieren (beide `IngredientSimilarOut` und `RecipeSimilarOut`)
- [ ] 14.2 `uv run python manage.py check` — keine Modell-Fehler
- [ ] 14.3 `uv run ruff check` — keine Linting-Fehler
- [ ] 14.4 `uv run pytest` — alle Tests grün
