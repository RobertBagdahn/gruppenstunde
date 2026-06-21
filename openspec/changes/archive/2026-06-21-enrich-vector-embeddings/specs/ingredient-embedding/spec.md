# ingredient-embedding Delta Specification

## MODIFIED Requirements

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
- **THEN** SHALL der Embedding-Text eine menschenlesbare Serialisierung ALLER Felder der Zutat sein (Name, Beschreibung, alle Nährwerte, alle Scores, Preis, Lagerung, Saison, Tags, RetailSection)
- **THEN** SHALL das Embedding via `text-embedding-004` (768 Dimensionen) erstellt werden

#### Scenario: Embedding-Fehler blockiert Save nicht
- **WHEN** die Embedding-Generierung fehlschlägt (z.B. Rate Limit, API nicht erreichbar)
- **THEN** SHALL der Save der Zutat NICHT fehlschlagen
- **THEN** SHALL `embedding` auf dem vorherigen Wert (oder NULL) bleiben
- **THEN** SHALL der Fehler geloggt werden

#### Scenario: Embedding nur bei relevanten Änderungen
- **WHEN** eine Zutat aktualisiert wird, aber alle embedding-relevanten Felder unverändert bleiben
- **THEN** SHALL kein neues Embedding generiert werden
- **THEN** SHALL `embedding_updated_at` unverändert bleiben

#### Scenario: Embedding-Text enthält alle Felder
- **WHEN** der Embedding-Text für eine Zutat gebaut wird
- **THEN** SHALL der Text folgende Informationen als menschenlesbaren deutschen Fließtext enthalten: name, description, energy_kcal, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g, vitamin_c_mg, child_score, scout_score, environmental_score, nova_score, nutri_class, price_per_kg, physical_density, physical_viscosity, durability_in_days, storage_type, cooking_factor, camp_suitable, season_start, season_end, nutritional_tags, retail_section
- **THEN** SHALL der Text KEIN rohes JSON sein, sondern strukturierte natürliche Sprache (z.B. "Pro 100g: 52 kcal, 0.3g Eiweiß, ...")
- **THEN** SHALL optionale Felder (NULL) im Text ausgelassen werden

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
