## ADDED Requirements

### Requirement: Batch AI price evaluation for ingredients
The AI service SHALL support batch evaluation of ingredient prices via Gemini. Given a list of ingredient IDs, it SHALL suggest realistic `price_per_kg` values based on the ingredient's name, retail section, nutritional profile, and market context.

#### Scenario: AI evaluates multiple ingredient prices
- **WHEN** `POST /api/admin/data-quality/ingredients/price-analysis/evaluate/` with `{ingredient_ids: [1, 2]}` is called by a staff user
- **THEN** the AI SHALL return for each ingredient: a suggested `price_per_kg`, a confidence level, and a brief reasoning in German
- **THEN** each suggestion SHALL reference comparable products and market norms
- **THEN** the response SHALL include a batch token for later apply operations

#### Scenario: AI handles unknown ingredients gracefully
- **WHEN** the AI cannot determine a price for an ingredient (e.g., very obscure item)
- **THEN** it SHALL return `suggested_price: null` and reasoning explaining the uncertainty
- **THEN** the item SHALL still appear in the response with `current_price` and `suggested_price: null`

#### Scenario: Rate limiting respected
- **WHEN** the batch contains more than 50 ingredients
- **THEN** the system SHALL process them in chunks of 50 with delays between chunks
- **THEN** the response SHALL aggregate all results into a single list

#### Scenario: Non-staff cannot access
- **WHEN** a non-staff user calls the batch price evaluation endpoint
- **THEN** a 403 error SHALL be returned

