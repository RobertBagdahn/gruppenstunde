## MODIFIED Requirements

### Requirement: Backend plausibility check on save
When a `RecipeItem` is updated as part of applying an AI quantity estimate, the backend SHALL verify that `quantity × portion.weight_g` is within a generous tolerance of the AI's originally estimated gram amount for that item. The tolerance SHALL be `max(expected_grams_total × 0.15, 2.0)` — i.e. 15% or 2 grams, whichever is larger. If the check fails, the backend SHALL reject the update with an error instead of silently persisting an inconsistent value. Manual edits (no `expected_grams_total` sent) are not affected.

#### Scenario: Consistent update passes the check
- **WHEN** a `RecipeItem` update sets `quantity` and `portion_id` such that `quantity × portion.weight_g` is within `max(expected × 0.15, 2.0)` of the AI-estimated grams
- **THEN** the update SHALL be persisted normally

#### Scenario: Inconsistent update is rejected
- **WHEN** a `RecipeItem` update would result in `quantity × portion.weight_g` deviating from the AI-estimated grams beyond `max(expected × 0.15, 2.0)` (e.g. due to a client bug re-introducing the portion/quantity mismatch)
- **THEN** the backend SHALL reject the update with an error and SHALL NOT persist the inconsistent value

#### Scenario: Small legitimate variation passes the check
- **WHEN** the resulting gram amount differs by less than 15% from the AI estimate (e.g. expected 50g, result 48g due to a portion with weight_g=24, quantity=2)
- **THEN** the update SHALL be persisted normally as this reflects legitimate cooking-portion variation

#### Scenario: Sub-gram floating-point variation passes the check
- **WHEN** the resulting gram amount differs from the AI estimate by less than 2g (e.g. expected 1.0g, result 0.99g due to floating-point scaling)
- **THEN** the update SHALL be persisted normally as this is within the minimum tolerance floor
