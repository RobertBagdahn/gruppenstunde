# Ingredient Matching

## Purpose

Parsing, matching and AI enrichment of ingredient names against the ingredient database, with replacement-aware match results.
## Requirements
### Requirement: Name/Note Parser

The system SHALL parse raw ingredient strings and extract quantity and unit on a best-effort basis. The parser SHALL extract known modifier words (state: frisch/TK/tiefgefroren/getrocknet/geräuchert/eingelegt/gemahlen/gerieben/geröstet; color: rot/grün/gelb/weiß/schwarz; size: groß/klein/dick/dünn; prep: gehackt/gewürfelt/geschnitten/geschält/gepresst) from the ingredient name and store them as the note. The parser SHALL search against both `Ingredient.name` and `IngredientAlias.name`. The parser SHALL recognize a canonical unit list including `Liter`, `Dose`, `Glas`, `Tasse`, `Becher`, `Packung`, `Handvoll`, `Bund`, `Scheibe`, `Zehe`, `Prise`, `Schuss`, `Päckchen`, and abbreviations (`l`, `ml`, `g`, `kg`, `EL`, `TL`, `Stück`, `Stk.`, `Pck.`, `Bd.`) and SHALL strip quantity and unit from the matched name.

#### Scenario: Simple state modifier extracted
- **WHEN** the parser receives "Fladenbrot frisch"
- **THEN** it SHALL return name="Fladenbrot", note="frisch"

#### Scenario: Color + ingredient parsed
- **WHEN** the parser receives "rote Zwiebel"
- **THEN** it SHALL return name="Zwiebel", note="rot"

#### Scenario: Multi-word ingredient with container preserved
- **WHEN** the parser receives "Tomaten aus der Dose"
- **THEN** it SHALL return name="Tomaten aus der Dose", note="" (container is part of identity)

#### Scenario: Quantity and unit parsed (best effort)
- **WHEN** the parser receives "200g Mehl"
- **THEN** it SHALL return quantity=200, unit="g", name="Mehl", note=""

#### Scenario: Liter unit parsed
- **WHEN** the parser receives "1 Liter Orangensaft"
- **THEN** it SHALL return quantity=1, unit="Liter", name="Orangensaft", note=""

#### Scenario: Container unit parsed
- **WHEN** the parser receives "1 Dose Ananas"
- **THEN** it SHALL return quantity=1, unit="Dose", name="Ananas", note=""

#### Scenario: Quantity without unit defaults to Stück
- **WHEN** the parser receives "2 Fladenbrot"
- **THEN** it SHALL return quantity=2, unit="Stück", name="Fladenbrot", note=""

#### Scenario: No modifier present
- **WHEN** the parser receives "Salz"
- **THEN** it SHALL return name="Salz", note="", quantity=0, unit=""

#### Scenario: Cascading fallback — rule-based fails, Jaccard finds match
- **WHEN** the parser receives "Erdbeeren frisch" and no rule matches "Erdbeeren" (plural not in DB)
- **THEN** it SHALL compute word-level Jaccard against known ingredients and match "Erdbeere" → name="Erdbeere", note="frisch"

#### Scenario: Cascading fallback — Gemini parses ambiguous case
- **WHEN** the parser receives "Grüner Salat mit Kräutern" and no algorithm finds a clear split
- **THEN** it SHALL call Gemini to determine name/note split

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

### Requirement: Gemini Enrichment Service

The system SHALL provide a reusable `enrich_ingredient()` service that calls Gemini to generate nutritional data (energy_kcal, protein_g, fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, child_score, scout_score, environmental_score, nova_score, nutri_class, portion data) for a new ingredient name.

#### Scenario: Successful enrichment
- **WHEN** `enrich_ingredient("Freekeh")` is called
- **THEN** Gemini SHALL return structured nutritional data with all required fields

#### Scenario: Gemini unavailable
- **WHEN** Gemini returns an error or is unavailable
- **THEN** `enrich_ingredient()` SHALL return None and the ingredient SHALL remain as DRAFT without nutritional data

### Requirement: Confidence Scoring

The system SHALL compute a confidence score for each match attempt. The score SHALL be between 0.0 and 1.0. Each stage SHALL use its own scoring algorithm. The overall match confidence SHALL be the score from the stage that found the match.

#### Scenario: Jaccard confidence
- **WHEN** Jaccard similarity is computed
- **THEN** confidence SHALL equal the Jaccard coefficient (|intersection| / |union| of word sets)

#### Scenario: Fuzzy confidence
- **WHEN** pg_trgm + Levenshtein similarity is computed
- **THEN** confidence SHALL be 0.6 × pg_trgm_score + 0.4 × (1 − levenshtein_distance / max(len_a, len_b))

#### Scenario: Embedding confidence
- **WHEN** embedding similarity is computed
- **THEN** confidence SHALL be the sigmoid-calibrated percentage from `similarity_to_pct()` divided by 100

### Requirement: Human-in-the-Loop
The system SHALL trigger human intervention for grey-zone matches, multiple close matches, and complete misses. The response SHALL show up to five candidates, confidence, matching method, and a human-readable reason. The matcher SHALL return unresolved preview data for complete misses and SHALL NOT create an Ingredient as a side effect.

#### Scenario: Grey zone triggers dialog with top 5
- **WHEN** confidence falls in the grey zone and no candidate exceeds its stage threshold
- **THEN** the system SHALL return `needs_review=true` with up to five candidates and explanation data

#### Scenario: Multiple matches trigger dialog
- **WHEN** multiple candidates exceed a stage threshold with a score difference below the configured limit
- **THEN** the system SHALL return `needs_review=true` with all relevant candidates and require user selection

#### Scenario: Complete miss returns unresolved preview
- **WHEN** no candidate is found by any algorithmic stage
- **THEN** the system SHALL return `needs_review=true` with empty or generated candidates and a new-ingredient option
- **THEN** the matcher SHALL not create a database row

#### Scenario: Complete miss triggers dialog
- **WHEN** no candidate is found by any algorithmic stage
- **THEN** the system SHALL return `needs_review=true` with empty suggestions and the Frontend SHALL open the existing ingredient search dialog

#### Scenario: User accepts suggestion
- **WHEN** the user selects a candidate from the review UI
- **THEN** the system SHALL use the user's choice for the pending recipe item

### Requirement: Ingredient Usage Count

The system SHALL track how often each ingredient is used across all recipes. The `usage_count` field SHALL be a denormalized integer on the Ingredient model, initially populated via data migration. Django Signals (`post_save` / `post_delete` on `RecipeItem` and `Portion`) SHALL keep `usage_count` updated in real time.

#### Scenario: Usage count initialized
- **WHEN** the data migration runs
- **THEN** `usage_count` SHALL equal the number of RecipeItems referencing this Ingredient through their Portion

#### Scenario: Usage count updated on recipe item creation
- **WHEN** a new RecipeItem is created referencing an Ingredient through its Portion
- **THEN** the Ingredient's `usage_count` SHALL increment by 1

#### Scenario: Usage count influences ordering
- **WHEN** the matcher searches for candidates
- **THEN** candidates SHALL be ordered by `usage_count` descending before confidence scoring

### Requirement: MatchResult API Exposure
The system SHALL expose ingredient ID, name, confidence, matching method, note, new flag, review flag, candidates, and replacement context in review responses. It SHALL also expose a human-readable reason and technical details sufficient for the UI to explain why a candidate was proposed. Every candidate SHALL include `id`, `name`, `slug`, and `confidence`.

#### Scenario: Successful match exposed
- **WHEN** a stage finds a match
- **THEN** the API SHALL include the matching method, confidence, the stage's top candidates, and explanation

#### Scenario: Needs review exposed
- **WHEN** the matcher triggers human review
- **THEN** the API SHALL include `needs_review=true` and the data required for manual selection without persisting a new ingredient

#### Scenario: Candidate exposes slug
- **WHEN** a candidate is serialized
- **THEN** it SHALL include the ingredient `slug` for resolving detail and portion endpoints

#### Scenario: Replacement result exposed
- **WHEN** matching `Jodsalz` against a recipe containing mapped `Salz`
- **THEN** the API SHALL expose the candidate ingredient, replacement metadata and confidence

#### Scenario: Normal result unchanged
- **WHEN** no replacement mapping applies
- **THEN** the existing match fields SHALL remain available and replacement fields SHALL be null

### Requirement: Quantity-token stripping fallback
When the parser produces no name with a quantity/unit split (confidence below 0.9), the matcher SHALL strip a leading quantity and unit token (number plus known unit or bare number followed by a name) from the raw string before running the Jaccard and fuzzy stages. The stripped quantity and unit SHALL be preserved on the match result as technical details for downstream quantity conversion.

#### Scenario: Liter prefixed name matched after stripping
- **WHEN** the parser fails on "1 Liter Orangensaft" and the matcher strips "1 Liter"
- **THEN** Stage 1/2 SHALL match "Orangensaft" and the result SHALL carry the stripped quantity 1 and unit "Liter" as technical details

#### Scenario: Quantity without unit stripped
- **WHEN** the parser fails on "2 Fladenbrot"
- **THEN** the matcher SHALL strip "2" and SHALL match "Fladenbrot" with quantity 2 retained

#### Scenario: No leading token — no stripping
- **WHEN** a raw string starts with the ingredient name (e.g. "Orangensaft 100%")
- **THEN** the matcher SHALL not strip any token and SHALL match against the full name

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

### Requirement: Zutatennamen werden vor dem Matching normalisiert
Das System SHALL Zutatennamen vor dem Matching normalisieren: Plural-Klammern (`(n)`, `(er)`, `(en)`, `(e)`, `(s)`) auflösen, Größen-Adjektive und Größenangaben in die Notiz verschieben und führende Mengenwörter mit Plural-Klammer entfernen. Der ursprüngliche Rohname MUST erhalten bleiben.

#### Scenario: Menge mit Plural-Klammer
- **WHEN** der Rohname `Prise(n) Salz` lautet
- **THEN** wird `Salz` zugeordnet
- **AND** der Treffer ist exakt, nicht „Offen“

#### Scenario: Plural-Klammer und Größe
- **WHEN** der Rohname `große Ei(er), Größe L` lautet
- **THEN** wird der Name zu `Ei` normalisiert
- **AND** „groß“ und „Größe L“ stehen in der Notiz

### Requirement: Kopfnomen-Treffer als Vorschlag
Findet die volle Bezeichnung keinen Treffer, SHALL das System den Kopf vor `,`, ` mit `, ` ohne ` und Klammern per exaktem Namen und Alias prüfen. Ein Treffer MUST als Vorschlag mit Status „zu prüfen“ geliefert werden, der Zusatz MUST in der Notiz erhalten bleiben, und das System MUST nicht still bestätigen.

#### Scenario: Zusatz „mit Kohlensäure“
- **WHEN** der Rohname `Mineralwasser mit Kohlensäure` lautet und die Zutat `Mineralwasser` existiert
- **THEN** ist `Mineralwasser` vorbelegt mit Status „zu prüfen“
- **AND** die Notiz enthält „mit Kohlensäure“

#### Scenario: Kein Teilwort-Treffer
- **WHEN** der Rohname `Kokosmilch` lautet
- **THEN** wird nicht auf `Milch` gekürzt

### Requirement: Klammer-Zusätze und Plural beim Kandidatenvergleich
Beim Vergleich mit vorhandenen Zutaten SHALL das System Klammer-Zusätze der Kandidatennamen ignorieren und regelmäßige Plurale gleichsetzen.

#### Scenario: Ei und Eier (Größe M)
- **WHEN** der normalisierte Name `Ei` lautet und `Eier (Größe M)` verifiziert existiert
- **THEN** ist `Eier (Größe M)` Treffer oder vorbelegter Vorschlag

### Requirement: Hinweistexte entsprechen der Trefferstärke
Das System SHALL den Hinweis „ausreichend hoch/ausreichend ähnlich“ nur ausgeben, wenn die Konfidenz mindestens `FUZZY_THRESHOLD` erreicht. In der Grauzone MUST der Text „ähnlich, bitte prüfen“ lauten.

#### Scenario: Konfidenz 0,44
- **WHEN** der beste Kandidat 0,44 erreicht
- **THEN** lautet der Hinweis „ähnlich, bitte prüfen“
