# ingredient-embedding Specification

## Purpose
Defines embedding generation for Ingredients on save, pgvector storage, and embedding-based duplicate detection.

## MODIFIED Requirements

### Requirement: Ingredient has pgvector embedding field
Das Ingredient-Modell SHALL ein `embedding` Feld vom Typ `VectorField` haben, dessen Dimension durch das aktuell konfigurierte Embedding-Modell bestimmt wird (experimentell validiert, siehe Design-Dokument). Zusätzlich SHALL ein `embedding_updated_at` DateTimeField und ein `embedding_text_hash` CharField (SHA-256-Hash des zuletzt eingebetteten Texts) existieren.

#### Scenario: Embedding-Feld existiert
- **WHEN** das Ingredient-Modell inspiziert wird
- **THEN** SHALL ein `embedding` Feld mit der konfigurierten Ziel-Dimension vorhanden sein
- **THEN** SHALL `embedding` nullable sein (Standard: NULL)
- **THEN** SHALL `embedding_updated_at` und `embedding_text_hash` nullable sein

#### Scenario: Embedding wird bei Save generiert
- **WHEN** eine Zutat erstellt oder aktualisiert wird
- **THEN** SHALL nach dem erfolgreichen Save ein Embedding asynchron generiert werden
- **THEN** SHALL der Embedding-Text NUR aus Name, Beschreibung und Warengruppe bestehen (siehe "Embedding-Text enthält nur relevante Felder")
- **THEN** SHALL das Embedding via `gemini-embedding-001` (Vertex AI) erstellt werden

#### Scenario: Embedding-Fehler blockiert Save nicht
- **WHEN** die Embedding-Generierung fehlschlägt (z.B. Rate Limit, API nicht erreichbar)
- **THEN** SHALL der Save der Zutat NICHT fehlschlagen
- **THEN** SHALL `embedding` auf dem vorherigen Wert (oder NULL) bleiben
- **THEN** SHALL der Fehler geloggt werden

#### Scenario: Embedding nur bei Text-Änderung
- **WHEN** eine Zutat aktualisiert wird und der neu gebaute Embedding-Text denselben SHA-256-Hash wie `embedding_text_hash` hat
- **THEN** SHALL kein neues Embedding generiert werden
- **THEN** SHALL `embedding_updated_at` und `embedding_text_hash` unverändert bleiben

#### Scenario: Embedding-Text enthält nur relevante Felder
- **WHEN** der Embedding-Text für eine Zutat gebaut wird
- **THEN** SHALL der Text ausschließlich enthalten: `name`, `description` (falls vorhanden, gekürzt auf 2000 Zeichen), und die Warengruppe (`retail_section.name`, falls vorhanden)
- **THEN** SHALL KEINE Nährwerte, Scores, Preis, Lagerungs-, Saison- oder Tag-Informationen im Text enthalten sein
- **THEN** SHALL der Text KEIN rohes JSON sein, sondern strukturierte natürliche Sprache (z.B. "Zutat: Schweinebauch. Frisches Bauchfleisch vom Schwein. Abteilung: Fleisch & Wurst.")

### Requirement: Ingredient search vector
**Reason**: Das `search_vector`-Feld wurde nie befüllt (kein GIN-Index, keine Volltextsuche nutzt es), da `Ingredient` das generische `Content`-Pattern nie geerbt hat, aus dem das Feld ursprünglich übernommen wurde. Es ist totes Gewicht in Modell und Datenbank.

**Migration**: Django-Migration entfernt das `search_vector`-Feld von `Ingredient`. Vor der Migration wird verifiziert, dass keine Query/Index/API im Repository das Feld referenziert. Bestehende Zutaten-Suche (Fuzzy-Match via `pg_trgm`, siehe `ingredient-fuzzy-match`) ist von der Entfernung nicht betroffen, da sie das Feld nie genutzt hat.

### Requirement: Embedding-basierte Zutaten-Duplikatsuche
Das System SHALL eine API bereitstellen, die ähnliche Zutaten basierend auf einer kalibrierten %-Ähnlichkeit der Embeddings findet.

#### Scenario: Duplikatsuche mit kalibriertem Schwellenwert
- **WHEN** `GET /api/admin/data-quality/ingredients/duplicates/?similarity_threshold_pct=90` aufgerufen wird
- **THEN** SHALL das System alle Zutaten-Paare mit `similarity_pct >= similarity_threshold_pct` zurückgeben
- **THEN** SHALL jedes Paar `{ingredient_a: {...}, ingredient_b: {...}, similarity_pct: 97.5}` enthalten
- **THEN** SHALL die Ergebnisse nach `similarity_pct` absteigend sortiert sein
- **THEN** SHALL die Antwort paginiert sein (`{items, total, page, page_size, total_pages}`)

#### Scenario: Default Schwellenwert
- **WHEN** kein `similarity_threshold_pct` Parameter angegeben wird
- **THEN** SHALL ein kalibrierter Default-Wert verwendet werden, der aus den Ground-Truth-Paaren abgeleitet ist

#### Scenario: Keine Duplikate gefunden
- **WHEN** keine Zutaten-Paare den Schwellenwert erreichen
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
