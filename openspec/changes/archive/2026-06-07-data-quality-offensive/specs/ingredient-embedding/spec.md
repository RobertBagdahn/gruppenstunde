# ingredient-embedding Specification

## Purpose
Defines embedding generation for Ingredients on save, pgvector storage, and embedding-based duplicate detection.

## ADDED Requirements

### Requirement: Ingredient has pgvector embedding field
Das Ingredient-Modell SHALL ein `embedding` Feld vom Typ `VectorField(dimensions=768)` haben, das den Embedding-Vektor speichert. Zusätzlich SHALL ein `embedding_updated_at` DateTimeField existieren.

#### Scenario: Embedding-Feld existiert
- **WHEN** das Ingredient-Modell inspiziert wird
- **THEN** SHALL ein `embedding` Feld mit 768 Dimensionen vorhanden sein
- **THEN** SHALL `embedding` nullable sein (Standard: NULL)
- **THEN** SHALL `embedding_updated_at` nullable sein

#### Scenario: Embedding wird bei Save generiert
- **WHEN** eine Zutat erstellt oder aktualisiert wird
- **THEN** SHALL nach dem erfolgreichen Save ein Embedding asynchron generiert werden
- **THEN** SHALL der Embedding-Text aus Name, Beschreibung, NutritionalTags und RetailSection bestehen
- **THEN** SHALL das Embedding via `text-embedding-004` (768 Dimensionen) erstellt werden

#### Scenario: Embedding-Fehler blockiert Save nicht
- **WHEN** die Embedding-Generierung fehlschlägt (z.B. Rate Limit, API nicht erreichbar)
- **THEN** SHALL der Save der Zutat NICHT fehlschlagen
- **THEN** SHALL `embedding` auf dem vorherigen Wert (oder NULL) bleiben
- **THEN** SHALL der Fehler geloggt werden

#### Scenario: Embedding nur bei relevanten Änderungen
- **WHEN** eine Zutat aktualisiert wird, aber Name, Beschreibung, NutritionalTags und RetailSection unverändert bleiben
- **THEN** SHALL kein neues Embedding generiert werden
- **THEN** SHALL `embedding_updated_at` unverändert bleiben

### Requirement: Ingredient search vector
Das Ingredient-Modell SHALL ein `search_vector` Feld vom Typ `SearchVectorField` für PostgreSQL-Volltextsuche haben.

#### Scenario: Search vector wird aktualisiert
- **WHEN** eine Zutat gespeichert wird
- **THEN** SHALL der `search_vector` aus Name, Beschreibung und Aliases aktualisiert werden

### Requirement: Embedding-basierte Zutaten-Duplikatsuche
Das System SHALL eine API bereitstellen, die ähnliche Zutaten basierend auf Cosine-Ähnlichkeit der Embeddings findet.

#### Scenario: Duplikatsuche mit Threshold
- **WHEN** `GET /api/admin/data-quality/ingredients/duplicates/?threshold=0.05` aufgerufen wird
- **THEN** SHALL das System alle Zutaten-Paare mit `cosine_distance < threshold` zurückgeben
- **THEN** SHALL jedes Paar `{ingredient_a: {...}, ingredient_b: {...}, similarity: 0.98}` enthalten
- **THEN** SHALL die Ergebnisse nach similarity absteigend sortiert sein
- **THEN** SHALL die Antwort paginiert sein (`{items, total, page, page_size, total_pages}`)

#### Scenario: Default Threshold
- **WHEN** kein `threshold` Parameter angegeben wird
- **THEN** SHALL ein Default von 0.05 (entspricht 95% Similarity) verwendet werden

#### Scenario: Keine Duplikate gefunden
- **WHEN** keine Zutaten-Paare den Threshold unterschreiten
- **THEN** SHALL eine leere Liste mit `total: 0` zurückgegeben werden

### Requirement: Zutaten-Duplikate mergen
Das System SHALL einen Merge-Workflow bereitstellen, bei dem eine Quell-Zutat in eine Ziel-Zutat integriert wird.

#### Scenario: Merge durchführen
- **WHEN** Staff-User `POST /api/admin/data-quality/ingredients/merge/` mit `{source_id, target_id}` aufruft
- **THEN** SHALL der Name der Quell-Zutat als `IngredientAlias` zur Ziel-Zutat hinzugefügt werden
- **THEN** SHALL alle `RecipeItem`-Referenzen von der Quell- zur Ziel-Zutat umgebogen werden
- **THEN** SHALL die Quell-Zutat soft-deleted werden
- **THEN** SHALL der `updated_by` der Ziel-Zutat auf den ausführenden User gesetzt werden

#### Scenario: Merge mit sich selbst verhindert
- **WHEN** `source_id` und `target_id` identisch sind
- **THEN** SHALL ein 400-Fehler zurückgegeben werden

#### Scenario: Merge nur für Staff
- **WHEN** ein nicht-Staff-User den Merge-Endpoint aufruft
- **THEN** SHALL ein 403-Fehler zurückgegeben werden

#### Scenario: Vor dem Merge Vorschau
- **WHEN** `GET /api/admin/data-quality/ingredients/merge/preview/?source_id=X&target_id=Y` aufgerufen wird
- **THEN** SHALL die Antwort enthalten: Anzahl betroffener RecipeItems, Liste der Aliases beider Zutaten, Vergleich der Nährwerte

### Requirement: Duplikat als "Kein Duplikat" markieren
Staff-User SHALL ein Duplikat-Paar als falsch-positiv markieren können, sodass es nicht mehr in der Liste erscheint.

#### Scenario: Falsch-positiv markieren
- **WHEN** Staff-User `POST /api/admin/data-quality/ingredients/duplicates/dismiss/` mit `{ingredient_a_id, ingredient_b_id}` aufruft
- **THEN** SHALL dieses Paar in zukünftigen Duplikat-Suchen nicht mehr erscheinen
- **THEN** SHALL die Dismissal in einer `DuplicateDismissal`-Tabelle gespeichert werden

#### Scenario: Dismissal rückgängig machen
- **WHEN** Staff-User `DELETE /api/admin/data-quality/ingredients/duplicates/dismiss/` mit `{ingredient_a_id, ingredient_b_id}` aufruft
- **THEN** SHALL das Paar wieder in Duplikat-Suchen erscheinen
