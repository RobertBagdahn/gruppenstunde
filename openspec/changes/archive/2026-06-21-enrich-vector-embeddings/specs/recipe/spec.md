# recipe Delta Specification

## ADDED Requirements

### Requirement: Recipe embedding text enriched with ingredient data
Der Recipe-Embedding-Text SHALL neben title, summary, description und tags auch die vollständigen Daten aller zugehörigen Ingredients (via RecipeItems → Portions → Ingredients) als menschenlesbaren Text enthalten.

#### Scenario: Embedding-Text enthält Zutaten-Daten
- **WHEN** der Embedding-Text für ein Recipe gebaut wird
- **THEN** SHALL der Text die Namen und Nährwert-Informationen aller Ingredients enthalten
- **THEN** SHALL jede Zutat mit ihren wichtigsten Nährwerten (kcal, Eiweiß, Fett, Kohlenhydrate, Nutri-Score) repräsentiert sein
- **THEN** SHALL der Text pro Ingredient auf maximal 150 Zeichen begrenzt sein, um das Embedding-Input-Limit (2048 Tokens) nicht zu überschreiten

#### Scenario: Recipe ohne Zutaten
- **WHEN** ein Recipe keine RecipeItems hat
- **THEN** SHALL der Embedding-Text nur aus title, summary, description und tags bestehen
- **THEN** SHALL kein Fehler geworfen werden

### Requirement: Recipe embedding auto-generated on save
Das System SHALL bei jedem Save eines Recipes automatisch ein Embedding generieren, über einen `post_save`-Signal der asynchron nach dem Transaction-Commit läuft.

#### Scenario: Embedding bei Recipe-Save
- **WHEN** ein Recipe erstellt oder aktualisiert wird
- **THEN** SHALL nach dem erfolgreichen Transaction-Commit ein Embedding asynchron generiert werden
- **THEN** SHALL der Embedding-Text via `build_recipe_embedding_text()` gebaut werden
- **THEN** SHALL das Embedding via `create_embedding()` erzeugt und im `embedding`-Feld gespeichert werden

#### Scenario: Kein Embedding bei unveränderten Feldern
- **WHEN** ein Recipe aktualisiert wird, aber title, summary, description, recipe_type und servings unverändert bleiben
- **THEN** SHALL kein neues Embedding generiert werden
- **THEN** SHALL `embedding_updated_at` unverändert bleiben

#### Scenario: Embedding-Fehler blockiert Save nicht
- **WHEN** die Embedding-Generierung fehlschlägt
- **THEN** SHALL der Recipe-Save NICHT fehlschlagen
- **THEN** SHALL `embedding` auf dem vorherigen Wert bleiben
- **THEN** SHALL der Fehler geloggt werden

### Requirement: RecipeItem changes trigger recipe embedding update
Das System SHALL bei jeder Änderung an RecipeItems (create, update, delete) das zugehörige Recipe-Embedding asynchron neu generieren.

#### Scenario: RecipeItem hinzugefügt
- **WHEN** ein RecipeItem zu einem Recipe hinzugefügt wird
- **THEN** SHALL nach dem Transaction-Commit das Recipe-Embedding asynchron neu generiert werden
- **THEN** SHALL das neue Embedding die aktualisierten Zutaten-Daten enthalten

#### Scenario: RecipeItem gelöscht
- **WHEN** ein RecipeItem von einem Recipe entfernt wird
- **THEN** SHALL nach dem Transaction-Commit das Recipe-Embedding asynchron neu generiert werden
- **THEN** SHALL das neue Embedding die aktualisierten Zutaten-Daten enthalten

#### Scenario: Kein Cascade bei Ingredient-Änderung
- **WHEN** eine Zutat (Nährwerte, Name, etc.) geändert wird
- **THEN** SHALL das System KEINE Recipe-Embeddings der Recipes neu generieren, die diese Zutat verwenden
- **THEN** SHALL die Recipe-Embeddings erst beim nächsten Recipe-eigenen Save aktualisiert werden

## MODIFIED Requirements

### Requirement: Embedding-based similar recipes endpoint
Der `GET /api/recipes/{id}/similar/` Endpoint SHALL ähnliche Recipes basierend auf pgvector Embedding Cosine Distance finden, nicht basierend auf Tag-Überschneidungen.

#### Scenario: Ähnliche Recipes via Embedding
- **WHEN** `GET /api/recipes/{recipe_id}/similar/` aufgerufen wird
- **THEN** SHALL die Antwort eine Liste von bis zu 6 ähnlichen Recipes sein
- **THEN** SHALL jedes Element `{id, title, slug, distance}` enthalten
- **THEN** SHALL die Liste nach `distance` aufsteigend sortiert sein
- **THEN** SHALL das angefragte Recipe selbst nicht in den Ergebnissen sein
- **THEN** SHALL die Suche pgvector `CosineDistance` verwenden (nicht Tag-Matching)

#### Scenario: Kein Embedding vorhanden
- **WHEN** das angefragte Recipe kein Embedding hat
- **THEN** SHALL eine leere Liste zurückgegeben werden

#### Scenario: Visibility
- **WHEN** der Endpoint aufgerufen wird
- **THEN** SHALL nur Recipes mit `status=approved` in den Ergebnissen sein
- **THEN** SHALL ähnliche Recipes über alle Recipes hinweg gefunden werden (global, nicht user-spezifisch)
