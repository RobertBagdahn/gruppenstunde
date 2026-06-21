## Context

Die Embedding-Infrastruktur existiert bereits: `VectorField(768)` auf `Ingredient` und `Content` (Basisklasse für `Recipe`), `embedding_service.py` mit Build- und Update-Funktionen, `post_save`-Signale die asynchron Embeddings generieren. Der `find_similar_ingredients()`- und `find_similar_recipes()`-Service-Code ist ebenfalls vorhanden.

Was fehlt:
- Die Embedding-Texte enthalten nur einen Bruchteil der verfügbaren Felder
- Recipes haben keine Zutaten-Daten im Embedding
- Es gibt keinen öffentlichen API-Endpoint für ähnliche Zutaten
- Der Recipe-Similar-Endpoint vergleicht nur Tags, nicht Embeddings
- **Recipe-Embeddings werden nie automatisch generiert**: Nur Ingredients haben einen `post_save`-Signal der Embeddings async erzeugt. Für Content-Modelle (Recipe, Session, Blog, Game) gibt es keinen solchen Trigger — Embeddings entstehen nur via Admin-Action oder Management-Command
- **RecipeItem-Änderungen invaliden kein Recipe-Embedding**: Wenn Zutaten hinzugefügt/entfernt werden, ändert sich der Embedding-Text — aber es gibt kein Signal das eine Neu-Generierung anstößt
- CloudSQL hat nur die `vector`-Extension, aber nicht die `google_ml_integration`-Extension installiert — die native `embedding()`-SQL-Funktion ist nicht verfügbar
- Bestehende IVFFlat-Indizes auf Embedding-Spalten müssen durch performantere HNSW-Indizes ersetzt werden

## Goals / Non-Goals

**Goals:**
- Ingredient-Embedding aus menschenlesbarer Vollfeld-Serialisierung erzeugen
- Recipe-Embedding mit Zutaten-Daten (Ingredients + Nährwerte) anreichern
- `GET /api/ingredients/{slug}/similar/` Endpoint für Top-10 ähnliche Zutaten
- `GET /api/recipes/{id}/similar/` auf Embedding-basiert umstellen
- `google_ml_integration` und `vector` Extensions auf CloudSQL installieren
- Embedding-Erzeugung von Python Vertex AI SDK auf native SQL `embedding()`-Funktion umstellen
- HNSW-Indizes auf beiden Embedding-Spalten

**Non-Goals:**
- Kein Clustering / Hierarchie-Building (kommt später)
- Keine Änderung am Embedding-Modell oder den Dimensionen (bleibt `text-embedding-004`, 768d)
- Keine Änderung an `content`-basierten Embeddings (Session, Blog, Game) — nur Ingredient und Recipe (auch wenn die gleiche Infrastruktur genutzt wird, ändert sich das Textformat nur für Recipes)
- Kein Frontend-UI für ähnliche Zutaten/Rezepte in diesem Change (nur API)
- Keine Änderung an `content`-basierten Embeddings (Session, Blog, Game) — nur Ingredient und Recipe

## Decisions

### Decision 1: Embedding-Text-Format — menschenlesbare Key-Value-Struktur

**Gewählt:** Strukturierter deutscher Fließtext mit Key-Value-Paaren.

**Format Ingredient:**
```
Zutat: <name>. <description>. Pro 100g: <energy> kcal, <protein>g Eiweiß, 
<fat>g Fett, <carbs>g Kohlenhydrate, <sugar>g Zucker, <fibre>g Ballaststoffe, 
<salt>g Salz. Nutri-Score: <class>. Preis: <price>/kg. 
Lagerung: <storage>, <durability> Tage haltbar. Saison: <start>-<end>. 
Kind-Score: <child>, Pfadfinder-Score: <scout>, Umwelt-Score: <env>. 
Tags: <tag1>, <tag2>. Abteilung: <retail_section>.
```

**Format Recipe:**
```
Titel: <title>. <summary>. <description>. Typ: <recipe_type>, 
<servings> Portionen. Schwierigkeit: <difficulty>, Kosten: <costs_rating>, 
Dauer: <execution_time>min. Tags: <tags>. 
Zutaten: <ingredient1_name> (<energy> kcal, <protein>g Eiweiß, ...); 
<ingredient2_name> (...); ...
```

**Alternative verworfen:** Rohes JSON. Embedding-Modelle sind auf natürlicher Sprache trainiert — JSON-Syntax-Zeichen (`{`, `"`, `:`) sind Rauschen und verwässern die Vektor-Repräsentation.

### Decision 2: Recipe-Embedding mit Ingredients anreichern — eigener Builder

**Gewählt:** Neue Funktion `build_recipe_embedding_text(recipe)` in `embedding_service.py`, die via `RecipeItem → Portion → Ingredient` alle Zutaten auflöst und deren vollständige Daten (Nährwerte, Tags, Scores) in den Embedding-Text einbettet.

**Warum eigener Builder statt `build_embedding_text` erweitern:** `build_embedding_text` ist generisch für alle Content-Typen. Recipe braucht spezifische Zutaten-Logik, die für Session/Blog/Game keinen Sinn ergibt. Der generische Builder bleibt unverändert.

Die `update_content_embedding()`-Funktion erkennt Recipe-Instanzen und delegiert an den Recipe-spezifischen Builder.

**Alternative verworfen:** Generischen Builder um optionalen `extra_text`-Parameter erweitern. Würde die API aufblähen und das Problem nur verschieben.

### Decision 3: Recipe Similar — komplett von Tags auf Embeddings umstellen

**Gewählt:** Der bestehende `GET /api/recipes/{id}/similar/` Endpoint wird vollständig auf `find_similar_recipes()` (pgvector CosineDistance) umgestellt. Kein Hybrid, kein Tag-Fallback.

**Warum kein Fallback:** Die `batch_update_embeddings`-Funktion existiert bereits und wird nach Deployment ausgeführt. Danach haben alle approved Recipes ein Embedding. Der Fallback-Fall (kein Embedding) tritt nur in einer Übergangsphase auf — dafür lohnt sich kein komplexer Hybrid-Code.

**Antwort-Schema-Änderung:** `RecipeSimilarOut` bekommt ein `distance: float` Feld statt des impliziten `shared_tags`-Rankings.

### Decision 4: Ingredient Similar Endpoint — eigener Endpoint unter /api/ingredients/

**Gewählt:** `GET /api/ingredients/{slug}/similar/?limit=10` im `ingredient_router`. Nutzt `find_similar_ingredients()` aus dem Service. Gibt `list[IngredientSimilarOut]` zurück.

**Response-Schema:**
```python
class IngredientSimilarOut(Schema):
    id: int
    name: str
    slug: str
    distance: float  # Cosine distance (0 = identisch, 2 = entgegengesetzt)
```

Der Service existiert bereits (`find_similar_ingredients` in `embedding_service.py:152`) und muss nur per API-Endpoint exponiert werden.

### Decision 5: Recipe Embedding Auto-Trigger — `post_save`-Signal

**Problem:** Recipes haben — im Gegensatz zu Ingredients — keinen automatischen Trigger der Embeddings generiert. Ohne diesen ist der Similar-Endpoint immer leer.

**Gewählt:** Ein neuer `post_save`-Signal in `recipe/signals.py`, der nach dem Muster von `supply/signals.py:61-92` arbeitet:

```python
@receiver(post_save, sender=Recipe)
def update_recipe_embedding(sender, instance, created, **kwargs):
    if hasattr(instance, "_updating_embedding"):
        return
    def _do_update():
        try:
            instance._updating_embedding = True
            if _embedding_fields_changed(instance, created):
                from content.services.embedding_service import update_content_embedding
                update_content_embedding(instance)
        except Exception:
            logger.warning("Failed to update embedding for Recipe #%d", instance.pk)
        finally:
            delattr(instance, "_updating_embedding")
    transaction.on_commit(lambda: threading.Thread(target=_do_update, daemon=True).start())
```

**Embedding-relevante Felder für Recipes:** `title`, `summary`, `description`, `recipe_type`, `servings` — plus indirekt: Änderungen an `RecipeItem`-Menge (siehe Decision 6).

**Kein eigener Quality-Score-Thread:** Der bestehende `update_recipe_quality_score`-Signal bleibt unabhängig und läuft weiter — Embedding-Update ist ein separater Thread.

### Decision 6: RecipeItem-Änderung → Recipe Embedding-Invaliderung

**Problem:** Wenn jemand eine Zutat zum Rezept hinzufügt, entfernt oder die Quantity ändert, ändert sich der Embedding-Text (weil Zutaten-Daten eingebettet werden). Aber es gibt kein Signal das dies erkennt.

**Gewählt:** `post_save`- und `post_delete`-Signale auf `RecipeItem`, die das zugehörige Recipe-Embedding async neu generieren:

```python
@receiver(post_save, sender=RecipeItem)
@receiver(post_delete, sender=RecipeItem)
def invalidate_recipe_embedding(sender, instance, **kwargs):
    try:
        recipe = instance.recipe
    except Exception:
        return
    def _do_update():
        from content.services.embedding_service import update_content_embedding
        update_content_embedding(recipe)
    transaction.on_commit(lambda: threading.Thread(target=_do_update, daemon=True).start())
```

**Warum kein Debouncing:** Bei Batch-Operationen (z.B. `ai-apply-ingredients` das mehrere RecipeItems auf einmal anlegt) feuert das Signal pro Item. Das ist in Ordnung: `update_content_embedding` hat einen Hash-Check der erkennt dass der Text sich schon geändert hat — nachfolgende Calls im selben Thread-Pool sind no-ops.

### Decision 7: Ingredient-Änderung → KEIN Cascade zu Recipe-Embeddings

**Problem:** Wenn eine Zutat aktualisiert wird (z.B. Nährwerte von "Milch" ändern sich), sind die Recipe-Embeddings stale — sie enthalten die alten Nährwerte der Zutat.

**Gewählt:** **Kein Cascade.** Die Kosten sind zu hoch: "Milch" wird in 150+ Recipes verwendet → 150 API-Calls. Stattdessen werden Recipe-Embeddings aktualisiert wenn:
1. Das Recipe selbst gespeichert wird (Decision 5)
2. RecipeItems des Recipes geändert werden (Decision 6)

Stale Embeddings sind akzeptabel — die Nährwert-Profile von Zutaten ändern sich selten (Datenqualitäts-Offensive, nicht tägliche Edits).

### Decision 8: Embedding-Erzeugung — Cloud SQL native `embedding()` statt Python Vertex AI SDK

**Gewählt:** Die `create_embedding()`-Funktion ruft die Cloud SQL-eigene `embedding('text-embedding-004', text)`-Funktion per raw SQL auf, statt das Python Vertex AI SDK zu verwenden.

**Architektur:**
```
Post-save Signal (Python)
  → build_ingredient_embedding_text(ingredient)   # menschenlesbarer Text
  → cursor.execute("SELECT embedding(%s, %s)", [model_id, text])
  → Cloud SQL ruft Vertex AI intern auf
  → embedding (real[768]) zurück
  → ingredient.embedding = embedding
  → ingredient.save(update_fields=["embedding"])
```

**Vorteile:**
- App-Server braucht keine Vertex AI Berechtigungen (nur Cloud SQL)
- Ein Netzwerk-Hop weniger (App → Cloud SQL → Vertex AI statt App → Vertex AI)
- Kein `google-genai` SDK Dependency im App-Server für Embeddings
- Cloud SQL handled Timeouts/Retries transparent

**Lokale Entwicklung:** Die `create_embedding()`-Funktion erkennt ob `google_ml_integration` verfügbar ist (via `try/except` auf der Extension). Falls nicht (lokales Docker pgvector), fällt sie auf den Python Vertex AI SDK-Code zurück.

**Alternative verworfen:** Alles via Python SDK. Funktioniert, aber verlässt sich auf externe API-Aufrufe und komplexes Permission-Management zwischen App-Server und Vertex AI.

### Decision 9: CloudSQL Extensions — `google_ml_integration` + `vector` statt `cloudsql.enable_pgvector`-Flag

**Gewählt:** Wir installieren beide Extensions via Django-Migration (`RunSQL`):
1. `google_ml_integration` (v1.2+) — stellt die `embedding()`-Funktion bereit
2. `vector` (pgvector) — stellt `VectorField` und CosineDistance bereit

Der DB-User braucht zusätzlich: `GRANT EXECUTE ON FUNCTION embedding TO inspi`.

**Warum kein `cloudsql.enable_pgvector`-Flag:** Die Cloud SQL Doku (2025+) erwähnt dieses Flag nicht mehr. Beide Extensions sind in Cloud SQL PostgreSQL 15 gebündelt und können direkt via `CREATE EXTENSION` installiert werden. Das auskommentierte Flag in `terraform/main.tf` wird entfernt (nicht entkommentiert).

**Risiko:** Das Installieren von `google_ml_integration` erfordert, dass die Cloud SQL Instanz Zugriff auf Vertex AI hat (muss im selben Projekt sein oder via VPC-SC verbunden). Das ist bei unserer aktuellen Konfiguration gegeben.

### Decision 10: HNSW-Indizes ersetzen bestehende IVFFlat-Indizes

**Gewählt:** Bestehende IVFFlat-Indizes (Migration `content/migrations/0005_add_ivfflat_indexes.py`) werden gedroppt und durch HNSW-Indizes ersetzt. Der `DROP INDEX` und `CREATE INDEX CONCURRENTLY` laufen in einer Migration mit `atomic = False` (CONCURRENTLY kann nicht in einer Transaktion laufen).

```sql
-- Neue Migration: erst droppen, dann HNSW erstellen
DROP INDEX IF EXISTS supply_ingredient_embedding_ivfflat;
DROP INDEX IF EXISTS recipe_recipe_embedding_ivfflat;
DROP INDEX IF EXISTS blog_blog_embedding_ivfflat;
DROP INDEX IF EXISTS session_groupsession_embedding_ivfflat;
DROP INDEX IF EXISTS game_game_embedding_ivfflat;

CREATE INDEX CONCURRENTLY idx_ingredient_embedding_hnsw
  ON supply_ingredient
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY idx_recipe_embedding_hnsw
  ON recipe_recipe
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Warum ersetzen:** IVFFlat ist älter und langsamer als HNSW. Doppelte Indizes kosten Memory (ca. 2×160MB = 320MB extra) — das sprengt das Budget des `db-f1-micro` (0.6GB). Nur Ingredient und Recipe bekommen HNSW-Indizes; Blog, Session, Game (aktuell <100 Einträge) behalten ihre IVFFlat-Indizes nicht — sie werden ebenfalls gedroppt und haben danach erstmal keinen Index bis wir in einem späteren Change Content-Generic-Embeddings überarbeiten.

**Migration-Constraints:**
- `atomic = False` auf der Migration-Klasse (erstes Mal im Codebase)
- `CREATE INDEX CONCURRENTLY` und `DROP INDEX CONCURRENTLY` verwenden
- Neue `reverse_sql`-Methode: HNSW droppen, IVFFlat wiederherstellen

**Risiko:** Der Index braucht Speicher (`m × ef_construction × dimensions × 4 bytes` pro Eintrag). Bei 768 Dimensionen sind das ~16KB pro Zeile. Für 10k Ingredients ≈ 160MB — akzeptabel für db-f1-micro (ca. 0.6GB RAM verfügbar für shared_buffers).

## Risks / Trade-offs

- **[Embedding-Kosten]**: Längere Embedding-Texte (besonders Recipes mit vielen Zutaten) erhöhen die Token-Nutzung bei Gemini. → Text-Embedding-004 hat 2048 Token Input-Limit; Recipes mit >20 Zutaten könnten kürzen. Builder soll Zutaten-Daten pro Ingredient auf 150 Zeichen begrenzen.
- **[Lokale Entwicklung]**: `google_ml_integration` ist eine Cloud SQL-spezifische Extension, nicht in `pgvector/pgvector:pg15` verfügbar. → `create_embedding()` fällt automatisch auf Python SDK zurück.
- **[Stale Embeddings]**: Nach Format-Änderung müssen alle Embeddings neu generiert werden. → `batch_update_embeddings(force=True)` direkt nach Deployment ausführen.
- **[Cold Start]**: Neue Zutaten/Rezepte bekommen Embedding erst nach async post_save → ähnliche-Einträge kurzfristig leer. → Akzeptabel; Frontend zeigt "Keine ähnlichen Einträge" statt Ladeanimation.
- **[Recipe Similar Behaviour Change]**: Der Endpoint liefert komplett andere Ergebnisse als vorher (Embedding statt Tags). → Breaking Change, aber das Projekt befindet sich in aktiver Entwicklung ohne Rückwärtskompatibilitäts-Anforderung.
- **[Ingredient → Recipe Embedding Stale]**: Wenn Zutaten-Nährwerte geändert werden, sind Recipe-Embeddings nicht automatisch aktuell. → Kein Cascade (siehe Decision 7). Recipes bekommen frische Embeddings beim nächsten eigenen Save.
- **[Migration CONCURRENTLY + atomic = False]**: Erstmalige Verwendung von `CREATE INDEX CONCURRENTLY` in einer Django-Migration. → Gründlich lokal testen; `CONCURRENTLY` erfordert dass keine andere Transaktion läuft (deployen wenn keine DB-Aktivität).

## Open Questions

- Keine — alle Entscheidungen sind getroffen.
