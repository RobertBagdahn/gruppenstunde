## MODIFIED Requirements

### Requirement: Ingredient Fuzzy Match API
The system SHALL provide `GET /api/ingredients/suggest/?q=<text>` that returns ranked ingredient matches using PostgreSQL pg_trgm similarity, with secondary sorting by usage_count and enriched response fields.

#### Scenario: Successful fuzzy match with enriched response
- **WHEN** a user queries with text that has similar ingredients in the database
- **THEN** the system SHALL return up to `limit` matches (default 15, configurable via `limit` parameter)
- **THEN** each result SHALL include: `id`, `name`, `slug`, `similarity`, `matched_via`, `nutri_class`, `price_per_kg`, `usage_count`

#### Scenario: Secondary sort by usage_count
- **WHEN** multiple ingredients have the same similarity score
- **THEN** ingredients with higher `usage_count` SHALL appear first
- **THEN** the sort order SHALL be: similarity DESC, then usage_count DESC

#### Scenario: Alias included in search
- **WHEN** a user queries with text matching an IngredientAlias rather than the canonical name
- **THEN** the system SHALL include that ingredient in results with the alias similarity score

#### Scenario: Similarity threshold filtering
- **WHEN** a user queries with text
- **THEN** the system SHALL only return matches with similarity > 0.3

#### Scenario: No matches found
- **WHEN** a user queries with text that has no similar ingredients (all below 0.3)
- **THEN** the system SHALL return an empty list

#### Scenario: Configurable limit
- **WHEN** a user provides a `limit` query parameter
- **THEN** the system SHALL return at most that many results (max 30)
- **THEN** if no `limit` is provided, the default SHALL be 15
