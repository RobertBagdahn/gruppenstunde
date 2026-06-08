## MODIFIED Requirements

### Requirement: Cached nutrition fields on Recipe
The Recipe model SHALL cache only `cached_vitamin_c_mg` as micronutrient cache field. The fields `cached_vitamin_a_mg`, `cached_vitamin_d_ug`, `cached_vitamin_b12_ug`, `cached_calcium_mg`, `cached_iron_mg` SHALL be removed.

The Recipe model's `embedding` field SHALL be migrated from `BinaryField` to `VectorField(dimensions=768)`.

The Recipe model SHALL include the following new fields:
- `quality_score` (IntegerField, nullable, default NULL, validators=[0..100])
- `quality_score_updated_at` (DateTimeField, nullable, default NULL)

#### Scenario: Recipe cache recalculation
- **WHEN** `recalculate_recipe_cache` runs
- **THEN** only `cached_vitamin_c_mg` is calculated and stored as micronutrient cache (macros unaffected)

#### Scenario: Nutrition breakdown API response
- **WHEN** the nutrition breakdown endpoint is called
- **THEN** micronutrient totals include only `vitamin_c_mg`

#### Scenario: Recipe embedding is pgvector
- **WHEN** a Recipe is saved
- **THEN** the embedding SHALL be stored as VectorField(768) via pgvector
- **THEN** cosine distance queries SHALL be supported via PostgreSQL `<=>` operator

#### Scenario: Recipe quality score in API
- **WHEN** `GET /api/recipes/{id}/` is called
- **THEN** the response SHALL include `quality_score` and `quality_score_updated_at`

### Requirement: Embedding-based recipe duplicate detection
The Recipe API SHALL provide an endpoint that finds similar recipes based on embedding cosine distance.

#### Scenario: Find duplicate recipes
- **WHEN** Staff-User `GET /api/recipes/{id}/duplicates/?threshold=0.05` is called
- **THEN** a paginated list of similar recipes with similarity scores SHALL be returned
- **THEN** each result SHALL contain `{id, title, slug, similarity}`

#### Scenario: Duplicate list for all recipes
- **WHEN** Staff-User `GET /api/admin/data-quality/recipes/duplicates/?threshold=0.05` is called
- **THEN** all recipe pairs with cosine_distance < threshold SHALL be returned
- **THEN** the response SHALL be paginated

#### Scenario: Merge duplicate recipes
- **WHEN** Staff-User `POST /api/admin/data-quality/recipes/merge/` with `{source_id, target_id}` is called
- **THEN** the source recipe SHALL be soft-deleted
- **THEN** a ContentLink with `link_type="duplicate_merged"` SHALL be created between source and target

