# infrastructure Delta Specification

## ADDED Requirements

### Requirement: Cloud SQL Google ML Integration Extension
Die Cloud SQL PostgreSQL Instanz SHALL die `google_ml_integration` Extension (v1.2+) installiert haben, um die native `embedding()` SQL-Funktion bereitzustellen.

#### Scenario: Extension installieren
- **WHEN** die Django-Migration `google_ml_integration` ausführt
- **THEN** SHALL `CREATE EXTENSION IF NOT EXISTS google_ml_integration VERSION '1.2'` erfolgreich sein
- **THEN** SHALL die `embedding()`-Funktion in SQL verfügbar sein

#### Scenario: DB-User Berechtigung für embedding-Funktion
- **WHEN** die Migration die Berechtigung setzt
- **THEN** SHALL `GRANT EXECUTE ON FUNCTION embedding TO inspi` ausgeführt werden
- **THEN** SHALL der inspi-DB-User die `embedding()`-Funktion aufrufen können

### Requirement: Cloud SQL pgvector Extension
Die Cloud SQL PostgreSQL Instanz SHALL die `vector` Extension (pgvector) installiert haben, um `VectorField`, CosineDistance und HNSW-Indizes zu unterstützen.

#### Scenario: pgvector Extension verfügbar
- **WHEN** `CREATE EXTENSION IF NOT EXISTS vector` ausgeführt wird
- **THEN** SHALL die Extension erfolgreich installiert werden
- **THEN** SHALL `CosineDistance("embedding", query_vector)` in Django-ORM funktionieren
- **THEN** SHALL `USING hnsw (embedding vector_cosine_ops)` CREATE INDEX funktionieren

### Requirement: HNSW-Indizes ersetzen IVFFlat-Indizes
Das System SHALL die bestehenden IVFFlat-Indizes auf Embedding-Spalten droppen und durch HNSW-Indizes (Cosine Distance) ersetzen.

#### Scenario: IVFFlat-Indizes werden gedroppt
- **WHEN** die Index-Migration ausgeführt wird
- **THEN** SHALL `DROP INDEX IF EXISTS supply_ingredient_embedding_ivfflat` und `DROP INDEX IF EXISTS recipe_recipe_embedding_ivfflat` (plus blog, session, game IVFFlat-Indizes) ausgeführt werden

#### Scenario: Ingredient HNSW Index
- **WHEN** die Index-Migration ausgeführt wird
- **THEN** SHALL `CREATE INDEX CONCURRENTLY idx_ingredient_embedding_hnsw ON supply_ingredient USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)` erfolgreich sein

#### Scenario: Recipe HNSW Index
- **WHEN** die Index-Migration ausgeführt wird
- **THEN** SHALL `CREATE INDEX CONCURRENTLY idx_recipe_embedding_hnsw ON recipe_recipe USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)` erfolgreich sein

#### Scenario: Migration läuft außerhalb einer Transaktion
- **WHEN** die HNSW-Index-Migration definiert wird
- **THEN** SHALL die Migration-Klasse `atomic = False` haben (CONCURRENTLY nicht in Transaktionen möglich)

## REMOVED Requirements

### Requirement: CloudSQL pgvector extension flag
**Reason**: Cloud SQL Doku (2025+) erwähnt das `cloudsql.enable_pgvector` Datenbank-Flag nicht mehr. Die `vector`-Extension wird direkt via `CREATE EXTENSION` installiert, ohne vorheriges Flag. Das Flag in `terraform/main.tf` (auskommentiert, Zeilen 150-153) wird komplett entfernt.
**Migration**: Das `database_flags`-Block (auskommentiert) wird aus `terraform/main.tf` gelöscht.

### Requirement: Datenbank-Kostenoptimierung — SD_HDD Disk-Typ
**Reason**: Der in der Spec dokumentierte `SD_HDD` Disk-Typ wird im tatsächlichen OpenTofu-Code (`terraform/main.tf`) nicht verwendet — dort ist `PD_SSD` konfiguriert. Die Spec war nicht synchron mit der Infrastruktur.
**Migration**: Keine — der tatsächliche Zustand (`PD_SSD`) bleibt unverändert. Die Spec wird lediglich mit der Realität synchronisiert, um Verwirrung zu vermeiden.
