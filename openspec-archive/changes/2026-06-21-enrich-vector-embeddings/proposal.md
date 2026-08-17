## Why

Die aktuellen Embeddings für Ingredients und Recipes verwenden nur einen Bruchteil der verfügbaren Daten (Name + Beschreibung + Tags). Nährwerte, Scores, Preis, Lagerung und Saison-Informationen fehlen — dadurch landen fachlich ähnliche Zutaten (z.B. zwei proteinreiche Hülsenfrüchte) weit auseinander im Vektorraum. Die Recipe-Embeddings enthalten zudem keinerlei Informationen über die tatsächlich verwendeten Zutaten.

Gleichzeitig werden Recipe-Embeddings im Gegensatz zu Ingredients **nie automatisch** beim Save generiert — es gibt keinen `post_save`-Signal für Content-Modelle. Der bestehende Recipe-Similar-Endpoint vergleicht nur Tags, nicht Embeddings.

## What Changes

- **Ingredient Embedding**: Vollständige menschenlesbare Serialisierung aller 30+ Felder statt nur Name + Description + Tags + RetailSection
- **Recipe Embedding**: Zusätzlich menschenlesbare Serialisierung aller zugehörigen Ingredients (via RecipeItems → Portions → Ingredients)
- **Recipe Embedding Auto-Trigger**: Neuer `post_save`-Signal auf Recipe + RecipeItem-Signale die Recipe-Embedding invaliden → automatische Generierung bei jedem Save und bei Zutaten-Änderungen
- **`GET /api/ingredients/{slug}/similar/`**: Neuer Endpoint für Top-10 ähnliche Zutaten (basierend auf pgvector CosineDistance)
- **`GET /api/recipes/{id}/similar/`**: Umstellung von tag-basiertem Vergleich auf pgvector-Embedding-basiert
- **CloudSQL Extensions**: `google_ml_integration` (v1.2+) und `vector` (pgvector) Extensions installieren + DB-User Berechtigung für `embedding()`-Funktion
- **Embedding-Erzeugung**: Umstellung von Python Vertex AI SDK auf native Cloud SQL `embedding()`-SQL-Funktion — kein externer API-Call mehr vom App-Server, Cloud SQL ruft Vertex AI direkt
- **Performance**: Bestehende IVFFlat-Indizes durch HNSW-Indizes ersetzen (schnellere ANN-Suchen, weniger Memory)

## Capabilities

### New Capabilities

- `ingredient-similar-endpoint`: Öffentlicher API-Endpunkt der die 10 ähnlichsten Zutaten zu einer gegebenen Zutat zurückgibt, basierend auf Embedding-Cosine-Distance

### Modified Capabilities

- `ingredient-embedding`: Der Embedding-Text für Ingredients wird von Teilfeld-Serialisierung auf menschenlesbare Vollfeld-Serialisierung umgestellt
- `recipe`: Der `/similar/` Endpoint wird von Tag-basiertem Matching auf Embedding-basiertes Matching umgestellt; Recipe-Embeddings werden automatisch bei Save und Zutaten-Änderungen generiert
- `content-base`: Der Embedding-Text für Recipe-Content wird von title+summary+description+tags auf die zusätzliche Einbettung von Ingredient-Daten erweitert
- `infrastructure`: CloudSQL benötigt zwei Extensions (`google_ml_integration` + `vector`); HNSW-Indizes ersetzen IVFFlat; DB-User braucht `EXECUTE ON FUNCTION embedding`

## Impact

- **Backend**: `content/services/embedding_service.py` (build-Funktionen + `create_embedding` auf SQL umgestellt), `recipe/signals.py` (neue Embedding-Signale), `supply/signals.py` (Feld-Tracking erweitert), `supply/api/ingredients.py` (neuer Endpoint), `recipe/api/recipes.py` (ähnlicher Endpoint umgestellt)
- **CloudSQL**: Migration zum Installieren von `google_ml_integration` Extension + `GRANT EXECUTE ON FUNCTION embedding` an DB-User
- **Index-Migration**: IVFFlat-Indizes droppen → HNSW-Indizes auf `ingredient.embedding` und `recipe.embedding` mit `atomic = False`
- **Schemas**: Neues `IngredientSimilarOut` Pydantic-Schema, `RecipeSimilarOut` erweitert um `distance`-Feld, Zod-Schemas im Frontend synchronisieren
- **Embeddings**: Alle bestehenden Embeddings müssen nach Deployment neu generiert werden (via `batch_update_embeddings(force=True)`)
