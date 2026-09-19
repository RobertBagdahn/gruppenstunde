# Ingredient Matching

## Purpose

Parsing, matching and AI enrichment of ingredient names against the ingredient database, with replacement-aware match results.
## Requirements
### Requirement: Name/Note Parser

The system SHALL parse raw ingredient strings and extract quantity and unit on a best-effort basis. The parser SHALL extract known modifier words (state: frisch/TK/tiefgefroren/getrocknet/geräuchert/eingelegt/gemahlen/gerieben/geröstet; color: rot/grün/gelb/weiß/schwarz; size: groß/klein/dick/dünn; prep: gehackt/gewürfelt/geschnitten/geschält/gepresst) from the ingredient name and store them as the note. The parser SHALL search against both `Ingredient.name` and `IngredientAlias.name`.

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

The system SHALL provide a unified `IngredientMatcher` service with four cascading stages: Wort-Jaccard, pg_trgm+Levenshtein, Embedding (pgvector), Human Dialog + Gemini enrichment. Each stage SHALL compute a confidence score (0.0–1.0). All stages SHALL search both `Ingredient.name` and `IngredientAlias.name`. The first stage whose score exceeds its threshold SHALL return the match immediately (first-above-threshold). Candidates SHALL be ordered by `usage_count` (descending) before scoring. If multiple candidates pass a threshold with score difference < 0.05, the system SHALL trigger Human-in-the-Loop. If no candidate exceeds a stage threshold but at least one has confidence ≥ 0.3 (grey zone), the system SHALL trigger Human-in-the-Loop with the top 5 candidates.

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

#### Scenario: No match found — human dialog then enrichment
- **WHEN** all three algorithm stages find no match for "Freekeh"
- **THEN** the system SHALL open the existing ingredient search dialog for manual selection; when the user chooses "neu anlegen", create a minimal Ingredient with status=DRAFT, call Gemini `enrich()` for nutritional data, and return the new ingredient

#### Scenario: Grey zone triggers top-5 suggestions
- **WHEN** Stage 2 finds a candidate with confidence 0.45 (below threshold 0.70, above 0.3) and no other stages succeed
- **THEN** the system SHALL return needs_review=true with the top 5 candidates and open the search dialog

#### Scenario: Multiple similar matches trigger human selection
- **WHEN** Stage 1 finds two candidates "Zwiebel frisch" (score 0.95) and "Zwiebel rot" (score 0.93) — score difference 0.02 < 0.05
- **THEN** the system SHALL return needs_review=true with both candidates and open the search dialog

#### Scenario: Popularity ordering
- **WHEN** multiple candidates match "Zwiebel" (e.g., "Zwiebel frisch" usage=100, "Zwiebel rot" usage=5, "Zwiebel getrocknet" usage=20)
- **THEN** candidates SHALL be scored in order: "Zwiebel frisch" first (highest usage_count)

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
The system SHALL expose ingredient ID, name, confidence, matching method, note, new flag, review flag, candidates, and replacement context in review responses. It SHALL also expose a human-readable reason and technical details sufficient for the UI to explain why a candidate was proposed.

#### Scenario: Successful match exposed
- **WHEN** a stage finds a match
- **THEN** the API SHALL include the matching method, confidence, candidates where relevant, and explanation

#### Scenario: Needs review exposed
- **WHEN** the matcher triggers human review
- **THEN** the API SHALL include `needs_review=true` and the data required for manual selection without persisting a new ingredient

#### Scenario: Replacement result exposed
- **WHEN** matching `Jodsalz` against a recipe containing mapped `Salz`
- **THEN** the API SHALL expose the candidate ingredient, replacement metadata and confidence

#### Scenario: Normal result unchanged
- **WHEN** no replacement mapping applies
- **THEN** the existing match fields SHALL remain available and replacement fields SHALL be null
