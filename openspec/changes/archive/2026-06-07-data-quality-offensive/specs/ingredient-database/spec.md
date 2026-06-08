## MODIFIED Requirements

### Requirement: Ingredient is standalone model
Ingredient SHALL be a standalone Django model (`models.Model`), NOT inheriting from the abstract `Supply` base class. This is because Ingredient has 30+ nutritional/score fields that have nothing in common with Supply (which provides name, slug, description, image). The model SHALL live in the `supply` app. `price_per_kg` (DecimalField) SHALL be the sole price field — no separate Price model.

The model SHALL include the following new fields for data quality and search:
- `embedding` (VectorField, dimensions=768, nullable, default NULL) — pgvector embedding for duplicate detection
- `embedding_updated_at` (DateTimeField, nullable, default NULL)
- `search_vector` (SearchVectorField, nullable, default NULL) — PostgreSQL full-text search
- `quality_score` (IntegerField, nullable, default NULL, validators=[0..100]) — data completeness score
- `quality_score_updated_at` (DateTimeField, nullable, default NULL)

#### Scenario: Ingredient has price_per_kg as only price field
- **WHEN** an Ingredient is created or updated
- **THEN** `price_per_kg` SHALL be settable directly on the Ingredient
- **THEN** there SHALL be no separate Price model or Price table

#### Scenario: Ingredient does not inherit Supply fields
- **WHEN** Ingredient model is inspected
- **THEN** it SHALL NOT have inherited fields from Supply (no automatic slug, image, soft_delete from Supply)
- **THEN** it SHALL define its own name, slug, description fields directly

#### Scenario: Ingredient has embedding and quality fields
- **WHEN** an Ingredient is saved with data changes affecting the embedding text
- **THEN** an embedding vector SHALL be generated and stored
- **THEN** `quality_score` SHALL be calculated from field completeness

