# Ingredient Matching Specification (Delta)

## MODIFIED Requirements

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

The system SHALL provide a unified `IngredientMatcher` service with four cascading stages: Wort-Jaccard, pg_trgm+Levenshtein, Embedding (pgvector), Human Dialog + Gemini enrichment. Each stage SHALL compute a confidence score (0.0–1.0). All stages SHALL search both `Ingredient.name` and `IngredientAlias.name`. The first stage whose score exceeds its threshold SHALL return the match immediately (first-above-threshold). Candidates SHALL be ordered by `usage_count` (descending) before scoring. If multiple candidates pass a threshold with score difference < 0.05, the system SHALL trigger Human-in-the-Loop. If no candidate exceeds a stage threshold but at least one has confidence ≥ 0.3 (grey zone), the system SHALL trigger Human-in-the-Loop with the top 5 candidates. The embedding stage SHALL never produce an automatic match: its best candidate SHALL only be returned as a `needs_review` result with the top 5 candidates. Every match result SHALL carry the top candidates of the deciding stage.

#### Scenario: Exact word-Jaccard match
- **WHEN** the matcher searches for "Fladenbrot" and DB has "Fladenbrot" (usage_count=42)
- **THEN** Stage 1 SHALL compute Jaccard=1.0, exceed threshold 0.90, and return MATCH with confidence=1.0

#### Scenario: Word form variation cascades to fuzzy
- **WHEN** the matcher searches for "rote Zwiebel" and DB has "Zwiebel rot" as alias (usage_count=15)
- **THEN** Stage 1 SHALL compute Jaccard({rote, zwiebel}, {zwiebel, rot}) = 1/3 ≈ 0.33, fail threshold 0.90, cascade to Stage 2

#### Scenario: Typo caught by fuzzy stage
- **WHEN** the matcher searches for "Champninon" (typo) and DB has "Champignon" (usage_count=30)
- **THEN** Stage 1 SHALL compute Jaccard {champninon} vs {champignon} ≈ word sets identical → Jaccard=1.0 but not exact string match, cascade to Stage 2; Stage 2 SHALL compute pg_trgm + Levenshtein weighted score ≥ 0.70 and return MATCH

#### Scenario: Semantic match via embedding only proposes candidates
- **WHEN** the matcher searches for "Rinderhack" and DB has "Rindergehacktes" (no Jaccard/fuzzy match)
- **THEN** Stage 3 SHALL find cosine distance ≤ threshold via pgvector and return `needs_review=true` with the top 5 embedding candidates; it SHALL NOT return an automatic match

#### Scenario: Embedding candidates carry confidence
- **WHEN** an embedding-stage result is returned
- **THEN** the candidate list SHALL include the sigmoid-calibrated confidence per candidate

#### Scenario: Confident match carries stage candidates
- **WHEN** a stage returns a match above its threshold
- **THEN** the result SHALL include the top candidates of that stage alongside the match

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

## ADDED Requirements

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
