## MODIFIED Requirements

### Requirement: Embedding-based recipe duplicate detection
The Recipe API SHALL provide endpoints that find similar recipes, merge them, and dismiss false-positive pairs.

#### Scenario: Find duplicate recipes
- **WHEN** Staff-User `GET /api/recipes/{id}/duplicates/?threshold=0.05` is called
- **THEN** a paginated list of similar recipes with similarity scores SHALL be returned
- **THEN** each result SHALL contain `{id, title, slug, similarity}`

#### Scenario: Duplicate list for all recipes
- **WHEN** Staff-User `GET /api/admin/data-quality/recipes/duplicates/?threshold=0.05` is called
- **THEN** all recipe pairs with cosine_distance < threshold SHALL be returned
- **THEN** the response SHALL be paginated
- **THEN** already dismissed pairs SHALL be excluded from the response

#### Scenario: Preview merge
- **WHEN** Staff-User `GET /api/admin/data-quality/recipes/merge/preview/?source_id={id}&target_id={id}` is called
- **THEN** the response SHALL contain `{source_id, source_name, target_id, target_name, affected_meal_count}`
- **THEN** `affected_meal_count` SHALL count Meal objects referencing the source recipe

#### Scenario: Merge duplicate recipes
- **WHEN** Staff-User `POST /api/admin/data-quality/recipes/merge/` with `{source_id, target_id}` is called
- **THEN** the source recipe SHALL be soft-deleted (`deleted_at` set)
- **THEN** a ContentLink with `link_type="duplicate_merged"` SHALL be created between source and target
- **THEN** the same pair SHALL NOT be mergeable again (error on duplicate)

#### Scenario: Dismiss duplicate pair
- **WHEN** Staff-User `POST /api/admin/data-quality/recipes/duplicates/dismiss/` with `{recipe_a_id, recipe_b_id}` is called
- **THEN** a DuplicateDismissal entry SHALL be created for this pair
- **THEN** the pair SHALL no longer appear in duplicate detection results

#### Scenario: Undismiss duplicate pair
- **WHEN** Staff-User `DELETE /api/admin/data-quality/recipes/duplicates/dismiss/` with `{recipe_a_id, recipe_b_id}` is called
- **THEN** the DuplicateDismissal entry SHALL be removed
- **THEN** the pair SHALL reappear in duplicate detection results (if still within threshold)

### Requirement: duplicate_merged LinkType
The `LinkType` choices SHALL include `"duplicate_merged"` for ContentLinks created during recipe merge.

#### Scenario: LinkType choice available
- **WHEN** a ContentLink is created by recipe merge
- **THEN** `link_type` SHALL be set to `"duplicate_merged"`
- **THEN** the `LinkType.choices` SHALL include `"duplicate_merged"`
