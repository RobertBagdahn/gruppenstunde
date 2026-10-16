## MODIFIED Requirements

### Requirement: Cascading Ingredient Matcher

The system SHALL provide a unified `IngredientMatcher` service with these cascading stages: learned mapping, exact name/alias, scored candidate match (normalized tokens, trigram, head noun), embedding rerank (candidates only), AI rerank per recipe (suggestion only), Human Dialog + Gemini enrichment. Each stage SHALL compute a confidence score (0.0–1.0). All stages SHALL search both `Ingredient.name` and `IngredientAlias.name`. The scored stage SHALL run on an in-memory index so that SQLite and PostgreSQL yield identical results. The first stage whose score exceeds its threshold SHALL return the match immediately. If several candidates are within 0.05 of the best score, the system SHALL preselect the canonical candidate (verified before draft, alias owner before others, higher `usage_count`, shorter name) as a suggestion with `needs_review=true` instead of leaving the row unselected. If no candidate exceeds a stage threshold but at least one has confidence ≥ 0.3 (grey zone), the system SHALL return `needs_review=true` with the top 5 candidates. The embedding and AI stages SHALL never produce an automatic match. Every match result SHALL carry the top candidates of the deciding stage.

#### Scenario: Exact match
- **WHEN** the matcher searches for "Fladenbrot" and DB has "Fladenbrot"
- **THEN** it SHALL return a match with confidence 1.0

#### Scenario: Word order does not matter
- **WHEN** the matcher searches for "Mandeln gemahlen" and DB has "Gemahlene Mandeln"
- **THEN** the scored stage SHALL return "Gemahlene Mandeln" as match

#### Scenario: Compound split
- **WHEN** the matcher searches for "Feta-Käse" and DB has "Feta"
- **THEN** "Feta" SHALL be returned as match

#### Scenario: Equal candidates preselect the canonical one
- **WHEN** the matcher searches for "Rohrzucker" and "Rohrzucker braun", "Brauner Rohrzucker", "Dunkler Rohrzucker" score within 0.05
- **THEN** the verified or most used candidate SHALL be preselected with `needs_review=true` and all candidates listed

#### Scenario: Same result on SQLite and PostgreSQL
- **WHEN** the benchmark runs against SQLite and against PostgreSQL with the same catalog
- **THEN** every row SHALL get the same selected ingredient

#### Scenario: Embedding only proposes candidates
- **WHEN** the embedding stage reranks candidates for "Rinderhack"
- **THEN** it SHALL return `needs_review=true` and SHALL NOT return an automatic match

#### Scenario: No match found
- **WHEN** no stage finds a candidate for "Freekeh"
- **THEN** the row SHALL stay open and offer "Zutat anlegen"

## ADDED Requirements

### Requirement: Konfliktwörter verhindern Fehlzuordnungen
Der Matcher SHALL Merkmalsgruppen kennen (u. a. frisch/getrocknet/trocken, rot/weiß/gelb/grün, edelsüß/rosenscharf/scharf/geräuchert, mager/20 %/40 %, süß/mittelscharf/scharf, Vollkorn/Type 405, TK/Dose/frisch). Enthalten Anfrage und Kandidat verschiedene Werte derselben Gruppe, MUST der Kandidat nicht automatisch gewählt werden. Enthält die Anfrage einen Spezifizierer, den der Kandidat nicht trägt, MUST der Kandidat höchstens als Vorschlag erscheinen.

#### Scenario: Trockenhefe
- **WHEN** die Anfrage `Trockenhefe` lautet und `Hefe (frisch)` sowie `Trockenhefe` existieren
- **THEN** wird `Trockenhefe` gewählt, nie `Hefe (frisch)`

#### Scenario: Rote Zwiebel
- **WHEN** die Anfrage `rote Zwiebel` lautet
- **THEN** wird nicht die generische `Zwiebel` automatisch gewählt

#### Scenario: Paprikapulver edelsüß
- **WHEN** die Anfrage `Paprikapulver edelsüß` lautet
- **THEN** wird `Paprikapulver (geräuchert)` nicht gewählt

### Requirement: Vom Matching ausgeschlossene Zutaten
Eine Zutat SHALL über ein Feld `exclude_from_matching` vom Matching ausgeschlossen werden können. Ausgeschlossene Zutaten MUST in keiner Matcher-Stufe als Treffer oder Kandidat erscheinen; bestehende Rezepte MUST unverändert bleiben.

#### Scenario: Kombi-Zutat
- **GIVEN** `Salz und Pfeffer` ist ausgeschlossen
- **WHEN** die Zeile `Salz und Pfeffer` importiert wird
- **THEN** erscheint `Salz und Pfeffer` weder als Treffer noch als Kandidat

### Requirement: Alias-Audit
Das System SHALL einen Management-Command `audit_ingredient_aliases` bereitstellen, der Aliase meldet, die generischer als ihre Zutat sind (Alias ist Kopfnomen eines anderen Katalogeintrags oder einer anderen Zutat mit höherer Nutzung) oder auf mehrere Zutaten zeigen. Ohne `--apply` MUST er nur berichten.

#### Scenario: Zu generischer Alias
- **GIVEN** der Alias `Hähnchen` gehört zu `Hähnchenbrustfilet`
- **WHEN** `audit_ingredient_aliases` läuft
- **THEN** wird der Alias als zu generisch gemeldet

### Requirement: KI-Reranker für offene Zeilen
Für angemeldete Nutzer SHALL das System nach dem algorithmischen Matching genau einen Gemini-Aufruf pro Rezept ausführen, der für jede offene Zeile aus deren Top-10-Kandidaten-IDs eine Zutat oder „neu“ wählt und begründet. Die Wahl MUST als Vorschlag mit `needs_review=true` erscheinen. Für anonyme Nutzer oder bei nicht verfügbarem Gemini MUST der Schritt ohne Fehler entfallen.

#### Scenario: Vorschlag für offene Zeile
- **GIVEN** die Zeile `Balsamico weiß` ist offen mit Kandidat `Weißer Balsamicoessig`
- **WHEN** der Reranker `Weißer Balsamicoessig` wählt
- **THEN** ist die Zutat vorbelegt, Status „zu prüfen“, mit KI-Begründung

#### Scenario: Anonyme Vorschau
- **GIVEN** ein nicht angemeldeter Besucher
- **WHEN** die Vorschau berechnet wird
- **THEN** findet kein Reranker-Aufruf statt

### Requirement: Embeddings für alle matchbaren Zutaten
Jede matchbare Zutat SHALL ein Embedding besitzen. Ein Management-Command MUST fehlende Embeddings in Batches nachziehen; neue und umbenannte Zutaten MUST ein Embedding erhalten.

#### Scenario: Backfill
- **WHEN** der Backfill-Command läuft
- **THEN** haben danach alle nicht gelöschten Zutaten ein Embedding
