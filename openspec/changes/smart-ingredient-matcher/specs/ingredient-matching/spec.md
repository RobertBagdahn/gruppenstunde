## ADDED Requirements

### Requirement: Name/Note Parser

The system SHALL parse raw ingredient strings into structured components: quantity, unit, name, and note. The parser SHALL extract known modifier words (state: frisch/TK/tiefgefroren/getrocknet/geräuchert/eingelegt/gemahlen/gerieben/geröstet; color: rot/grün/gelb/weiß/schwarz; size: groß/klein/dick/dünn; prep: gehackt/gewürfelt/geschnitten/geschält/gepresst) from the ingredient name and store them as the note.

#### Scenario: Simple state modifier extracted
- **WHEN** the parser receives "Fladenbrot frisch"
- **THEN** it SHALL return name="Fladenbrot", note="frisch"

#### Scenario: Color + ingredient parsed
- **WHEN** the parser receives "rote Zwiebel"
- **THEN** it SHALL return name="Zwiebel", note="rot"

#### Scenario: No modifier present
- **WHEN** the parser receives "Salz"
- **THEN** it SHALL return name="Salz", note=""

#### Scenario: Multi-word ingredient with container preserved
- **WHEN** the parser receives "Tomaten aus der Dose"
- **THEN** it SHALL return name="Tomaten aus der Dose", note="" (container is part of identity)

#### Scenario: Complex string with quantity and unit
- **WHEN** the parser receives "2 frische Fladenbrot, ca. 200g"
- **THEN** it SHALL return quantity=2, unit="Stück", name="Fladenbrot", note="frisch"

#### Scenario: Cascading fallback — rule-based fails, Jaccard finds match
- **WHEN** the parser receives "Erdbeeren frisch" and no rule matches "Erdbeeren" (plural not in DB)
- **THEN** it SHALL compute word-level Jaccard against known ingredients and match "Erdbeere" → name="Erdbeere", note="frisch"

#### Scenario: Cascading fallback — Gemini parses ambiguous case
- **WHEN** the parser receives "Grüner Salat mit Kräutern" and no algorithm finds a clear split
- **THEN** it SHALL call Gemini to determine name/note split

### Requirement: Cascading Ingredient Matcher

The system SHALL provide a unified `IngredientMatcher` service with four cascading stages: Wort-Jaccard, pg_trgm+Levenshtein, Embedding (pgvector), Gemini enrichment. Each stage SHALL compute a confidence score (0.0–1.0). The first stage whose score exceeds its threshold SHALL return the match immediately (first-above-threshold). Candidates SHALL be ordered by `usage_count` (descending) before scoring.

#### Scenario: Exact word-Jaccard match
- **WHEN** the matcher searches for "Fladenbrot" and DB has "Fladenbrot" (usage_count=42)
- **THEN** Stage 1 SHALL compute Jaccard=1.0, exceed threshold 0.90, and return MATCH with confidence=1.0

#### Scenario: Word form variation cascades to fuzzy
- **WHEN** the matcher searches for "rote Zwiebel" and DB has "Zwiebel rot" as alias (usage_count=15)
- **THEN** Stage 1 SHALL compute Jaccard({rote, zwiebel}, {zwiebel, rot}) = 1/3 ≈ 0.33, fail threshold 0.90, cascade to Stage 2

#### Scenario: Typo caught by fuzzy stage
- **WHEN** the matcher searches for "Champninon" (typo) and DB has "Champignon" (usage_count=30)
- **THEN** Stage 1 SHALL compute Jaccard {champninon} vs {champignon} ≈ word sets identical → Jaccard=1.0 but not exact string match, cascade to Stage 2; Stage 2 SHALL compute pg_trgm + Levenshtein weighted score ≥ 0.70 and return MATCH

#### Scenario: Semantic match via embedding
- **WHEN** the matcher searches for "Rinderhack" and DB has "Rindergehacktes" (no Jaccard/fuzzy match)
- **THEN** Stage 3 SHALL find cosine distance ≤ threshold via pgvector and return MATCH

#### Scenario: No match found — new ingredient with enrichment
- **WHEN** all three algorithm stages find no match for "Quinoa gepufft"
- **THEN** the system SHALL create a minimal Ingredient with status=DRAFT, call Gemini `enrich()` for nutritional data, and return the new ingredient

#### Scenario: Popularity ordering
- **WHEN** multiple candidates match "Zwiebel" (e.g., "Zwiebel frisch" usage=100, "Zwiebel rot" usage=5, "Zwiebel getrocknet" usage=20)
- **THEN** candidates SHALL be scored in order: "Zwiebel frisch" first (highest usage_count)

### Requirement: Gemini Enrichment Service

The system SHALL provide a reusable `enrich_ingredient()` service that calls Gemini to generate nutritional data (energy_kcal, protein_g, fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, child_score, scout_score, environmental_score, nova_score, nutri_class, portion data) for a new ingredient name.

#### Scenario: Successful enrichment
- **WHEN** `enrich_ingredient("Quinoa gepufft")` is called
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

The system SHALL allow human intervention when confidence is below a configurable minimum threshold or when Gemini enrichment fails.

#### Scenario: Low confidence triggers dialog
- **WHEN** all stages produce confidence < 0.3 for an ingredient
- **THEN** the system SHALL return a "needs_review" flag and the Frontend SHALL show a dialog where the user can manually match or create the ingredient

#### Scenario: User accepts suggestion
- **WHEN** the user confirms a low-confidence match in the dialog
- **THEN** the system SHALL use the user's choice and create the recipe item with the selected ingredient

### Requirement: Ingredient Usage Count

The system SHALL track how often each ingredient is used across all recipes. The `usage_count` field SHALL be a denormalized integer on the Ingredient model, initially populated via data migration.

#### Scenario: Usage count initialized
- **WHEN** the data migration runs
- **THEN** `usage_count` SHALL equal the number of RecipeItems referencing this Ingredient

#### Scenario: Usage count influences ordering
- **WHEN** the matcher searches for candidates
- **THEN** candidates SHALL be ordered by `usage_count` descending before confidence scoring
