## Context

Inspi hat hunderte Rezepte und tausende Zutaten in der PostgreSQL-Datenbank. Die Datenqualität ist uneinheitlich: Preise fehlen, Nährwerte sind lückenhaft, Duplikate existieren (z.B. "Tomatenmark" und "Tomatenmark 3-fach konzentriert"), und Metadaten wie `retail_section` oder `storage_type` sind oft nicht gesetzt.

Das bestehende Embedding-System (via `text-embedding-004`, gespeichert als `BinaryField`) funktioniert nur für Content-Typen (Recipe, GroupSession, Blog, Game). Zutaten haben keine Embeddings. Die pgvector-Migration (`BinaryField` → `VectorField(768)`) war bereits als "Slice 8" geplant, wurde aber nie durchgeführt.

Die AI-Infrastruktur (`core/services/gemini.py` mit `gemini_call()` und `gemini_embed()`) ist produktiv und zuverlässig. Sie kann für Batch-Preisbewertungen und Embedding-Generierung wiederverwendet werden.

## Goals / Non-Goals

**Goals:**
- pgvector als natives Vektorfeld für alle Content-Typen und Zutaten einführen
- Embedding bei jedem Save automatisch für Zutaten und Rezepte generieren
- Embedding-basierte Duplikaterkennung mit Merge-Workflow (alter Name → Alias)
- Statistische Preisanalyse mit Batch-AI-Neubewertungs-Workflow
- Datenqualitäts-Score (0-100) pro Zutat und Rezept, sichtbar für alle
- Interaktive Datenverteilungs-Charts (öffentlich) mit Recharts
- Field-Level Audit-Log für Zutaten und Rezepte
- Staff-only Datenqualität-Dashboard mit Trend-Chart
- Impact-Analyse: "X Rezepte betroffen" auf Zutatenseite

**Non-Goals:**
- Externe Preis-APIs (REWE, OpenFoodFacts) — nur AI-Schätzung
- Batch-Massenupdates (Einzelaktionen priorisiert)
- KI-Vertrauens-Marker (Field-Level Provenance)
- Duplikaterkennung über Content-Typen hinweg (nur innerhalb Zutaten bzw. Rezepte)
- Echtzeit-Duplikaterkennung beim Tippen (nur nach Save)

## Decisions

### D1: pgvector Migration — `django-pgvector` Library

**Entscheidung**: `django-pgvector` als Django-Field-Library für `VectorField` verwenden.

**Alternativen**:
- `pgvector` direkt mit raw SQL: Flexibler aber weniger Django-Integration
- `BinaryField` behalten: Keine nativen Vektoroperationen (kein `<=>` Kosinus-Distanz-Operator), keine Index-Unterstützung

**Rationale**: `django-pgvector` bietet native Django Model Field Integration, automatische Migration von `BinaryField`, und Zugriff auf PostgreSQLs `<=>` Operator für effiziente Ähnlichkeitssuche. Es ist die leichtgewichtigste Lösung mit der besten Django-Integration.

**Migration**: `BinaryField` → `VectorField(dimensions=768)` via Django-Migration mit Datenmigration (struct unpack → float list).

### D2: Embedding-Service — Erweiterung statt Neubau

**Entscheidung**: Den bestehenden `embedding_service.py` erweitern, um auch Zutaten zu unterstützen. Keine neue Service-Klasse.

**Rationale**: Der Service hat bereits `build_embedding_text()`, `create_embedding()`, `update_content_embedding()`, `cosine_similarity()`, `find_similar_content()`. Für Zutaten muss nur `build_embedding_text()` eine Zutaten-spezifische Textrepräsentation bauen (Name, Beschreibung, NutritionalTags, RetailSection). `find_similar_content()` braucht einen `find_similar_ingredients()` Zwilling.

### D3: Embedding-Trigger — Django Signal (post_save)

**Entscheidung**: `post_save` Signal auf Ingredient und Recipe, das asynchron (via Thread oder Hintergrund-Task) das Embedding aktualisiert.

**Rationale**: Synchrones Embedding würde Save-Latenz um 200-500ms erhöhen (Gemini API-Call). Ein `transaction.on_commit()` Hook mit Thread ist einfach und erfordert keinen Celery/Redis-Broker. Fehler beim Embedding (Rate Limit, API down) dürfen den Save nicht blockieren.

**Alternative**: Celery Task — overengineered für diesen Use Case.

### D4: Duplikaterkennung — pgvector `<=>` Operator

**Entscheidung**: Duplikatsuche via PostgreSQL `<=>` (Cosine Distance) Operator auf dem pgvector `VectorField`, mit IVFFlat-Index für Performance.

**Query-Pattern**: `Ingredient.objects.order_by(L2Distance('embedding', target_embedding))[:20]` mit `CosineDistance`-Filter.

**Threshold**: Konfigurierbarer Schwellwert (Slider 0.80–0.99), Standard 0.95. Cosine Distance < 0.05 (entspricht Similarity > 0.95) = potentielles Duplikat.

### D5: Qualitäts-Score — Regelbasiert, kein ML

**Entscheidung**: Ein regelbasierter Score (0-100), berechnet aus gewichteten Kategorien. Kein ML-Modell.

**Zutaten-Score**:
- Nährwerte: 40% (20 Felder: jedes nicht-null/nicht-0 Feld gibt Punkte)
- Preis: 15% (price_per_kg gesetzt = voll)
- Physische Daten: 15% (physical_density, physical_viscosity, storage_type, durability, cooking_factor)
- Klassifikation: 15% (retail_section, nutritional_tags)
- Pfadfinder-Felder: 10% (camp_suitable, season, preparation_time)
- Portionen: 5% (hat mindestens eine Portion)

**Rezept-Score**:
- Zutaten: 30% (alle RecipeItems haben gültige Portions mit Nährwert-Zutaten)
- Metadaten: 25% (summary, description, image, tags)
- Cache-Frische: 20% (cached_* Werte aktuell vs ingredient.updated_at)
- Nährwerte: 15% (cached_* Felder gefüllt)
- Preis: 10% (cached_price_total gesetzt)

**Rationale**: Transparent, deterministisch, keine Trainingsdaten nötig. Score wird bei jedem Save neu berechnet und gecached (`quality_score` + `quality_score_updated_at`).

### D6: Preisanalyse — Statistische Ausreißer

**Entscheidung**: Preis-Ausreißer über Z-Score pro RetailSection erkennen. Pro RetailSection: Mittelwert μ und Standardabweichung σ von `price_per_kg`. Zutat ist Ausreißer wenn |Z| > 2.5 oder `price_per_kg IS NULL`.

**Batch AI Workflow**:
1. `GET /api/admin/data-quality/ingredients/price-analysis/` → Liste auffälliger Zutaten
2. User wählt Zutaten per Checkbox
3. `POST /api/admin/data-quality/ingredients/price-analysis/evaluate/` → Gemini bewertet Preise
4. Response enthält für jede Zutat: aktueller Preis, KI-Vorschlag, Begründung
5. User reviewed und wendet an: `PATCH /api/admin/data-quality/ingredients/price-analysis/apply/` mit `[{id, price_per_kg}]`

### D7: Audit-Log — Separate Tabelle, JSON Field

**Entscheidung**: Eine `ChangeAuditLog` Tabelle mit:
- `content_type` (GFK zu Ingredient, Recipe, etc.)
- `object_id`
- `field_name` (CharField)
- `old_value` (TextField, nullable)
- `new_value` (TextField, nullable)
- `changed_by` (FK User)
- `changed_at` (DateTimeField)

**Trigger**: `pre_save` Signal, das alte und neue Werte vergleicht und nur geänderte Felder logged.

**Rationale**: Einfach, generisch, queryable. Kein JSON-Block pro Change (wäre schwer filterbar). Das bestehende `updated_by` Feld bleibt für "letzter Bearbeiter", das Audit-Log ist die komplette Historie.

### D8: Datenverteilungs-Charts — Dedizierte API-Endpunkte

**Entscheidung**: Neue öffentliche GET-Endpunkte, die aggregierte Statistiken zurückgeben (keine Rohdaten).

Endpunkte:
- `GET /api/data-quality/ingredients/distribution/cost` → `{buckets: [{range, count, avg_price}], stats: {mean, median, p95}}`
- `GET /api/data-quality/ingredients/distribution/energy` → `{buckets: [{range_kcal, count}], top_energy_dense: [...]}`
- `GET /api/data-quality/ingredients/distribution/nutrients` → `{nutrients: [{name, min, max, mean, median}]}`
- `GET /api/data-quality/recipes/distribution/cost` → `{buckets, stats}`
- `GET /api/data-quality/recipes/distribution/calories` → `{buckets, stats}`
- `GET /api/data-quality/recipes/distribution/nutri-score` → `{classes: [{class, count}]}`

Alle Endpunkte akzeptieren Query-Parameter: `tags` (NutritionalTag IDs für vegan/vegetarisch), `retail_section`, `status`, `recipe_type`.

### D9: Frontend-Architektur

**Entscheidung**: Neue Route `/admin/data-quality` mit zwei Sub-Routen:
- `/admin/data-quality/ingredients` — Zutaten-Qualitätsdashboard
- `/admin/data-quality/recipes` — Rezepte-Qualitätsdashboard

Jeweils mit Tab-Navigation für die Kategorien (Preisanalyse, Duplikate, Vollständigkeit, etc.).

**Chart-Seite**: `/data-quality/distributions` (öffentlich) mit Sub-Tabs für Zutaten und Rezepte, jeweils mit Chart-Typ-Auswahl.

**Komponentenstruktur**:
```
frontend-food/src/
  pages/
    admin/
      DataQualityPage.tsx          ← Root mit Sub-Routen
      DataQualityIngredientsPage.tsx
      DataQualityRecipesPage.tsx
      DataDistributionsPage.tsx    ← Öffentlich
  components/
    data-quality/
      PriceAnalysisTable.tsx
      DuplicateDetectionList.tsx
      CompletenessGrid.tsx
      QualityScoreBadge.tsx
      ImpactBadge.tsx
      AuditLogTimeline.tsx
      distribution/
        CostDistributionChart.tsx
        EnergyDistributionChart.tsx
        NutrientScatterChart.tsx
        NutriScoreDistributionChart.tsx
```

### D10: pgvector Extension in Cloud SQL

**Entscheidung**: pgvector Extension via OpenTofu aktivieren. In `terraform/postgres.tf` die Extension `vector` zur Datenbank hinzufügen. Lokal: `CREATE EXTENSION IF NOT EXISTS vector;` im Migration-Runscript.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Gemini Rate Limit (100 calls/15min)**: Batch-Embedding für tausende Zutaten könnte das Limit sprengen | Batch-Größen von 50 mit `time.sleep(2)` zwischen Batches; bestehendes Rate-Limiting respektieren |
| **pgvector Index-Größe**: IVFFlat Index auf 768-dim Vektoren braucht Speicher | Nur auf `embedding IS NOT NULL` filtern; HNSW-Index als Alternative evaluieren |
| **Embedding-Kosten**: ~15.000 Zutaten × 768 floats = ~45 MB Embedding-Daten + API-Kosten | Einmalige Generierung, dann inkrementell; API-Kosten sind minimal (0.000025$ pro 1000 Zeichen) |
| **Duplicate False Positives**: "Vollmilch 3.5%" und "Vollmilch 1.5%" könnten als Duplikat erkannt werden | Threshold-Slider in UI; "Kein Duplikat"-Button zum Markieren; Embedding-Text mit Nährwerten anreichern |
| **Merge-Datenverlust**: Beim Mergen von Zutaten könnten spezifische Nährwerte verloren gehen | Vor dem Merge Differenz-Anzeige; Ziel-Zutat behält ihre Werte, Quell-Zutat wird zum Alias; Undo nur via Admin möglich |
| **Audit-Log Speicher**: Field-Level Logging produziert viele Zeilen | Alte Einträge (>90 Tage) per Management Command bereinigen; nur signifikante Änderungen loggen |

## Migration Plan

1. **pgvector aktivieren**: OpenTofu + lokale Migration
2. **Migration BinaryField → VectorField**: Datenmigration mit struct.unpack
3. **Neue Felder zu Ingredient und Recipe**: embedding, search_vector, quality_score, quality_score_updated_at
4. **ChangeAuditLog Tabelle**: Neue Migration
5. **Embedding-Generierung**: `uv run python manage.py generate_embeddings --type ingredient --force`
6. **Quality Score Backfill**: `uv run python manage.py calculate_quality_scores`
7. **Frontend-Deploy**: Neue Routes und Komponenten

**Rollback**: pgvector Extension nicht entfernen (ist additiv). VectorField → BinaryField Rückmigration möglich. Frontend: Route entfernen.

## Open Questions

- **Q1**: IVFFlat oder HNSW Index für pgvector? HNSW ist schneller bei Queries, braucht aber mehr Speicher. Bei <20k Vektoren ist IVFFlat ausreichend. → Entscheidung im Implementation-Flow.
- **Q2**: Soll der Qualitäts-Score als Annotation (Query-time) oder als gecachtes Feld (Write-time) gespeichert werden? → Gecachtes Feld (Write-time) gewählt für API-Performance.
- **Q3**: Wie granular soll die Embedding-Text-Repräsentation für Zutaten sein? → Name + Beschreibung + NutritionalTags + RetailSection; Nährwerte optional für bessere Duplikaterkennung bei ähnlichen Produkten.
