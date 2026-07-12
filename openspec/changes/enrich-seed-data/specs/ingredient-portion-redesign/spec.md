## ADDED Requirements

### Requirement: Rank-1 Portion Must Have Plausible Weight
Every ingredient's rank-1 portion SHALL have a weight_g that reflects a typical serving amount for that ingredient type. Portions with weight_g ≤ 1.0g are only permitted for trace ingredients (spices, seasonings in "Prise" portions).

#### Scenario: Plausible rank-1 for vegetables
- **WHEN** viewing portions for "Zucchini"
- **THEN** rank-1 portion has weight_g between 100 and 300 (one whole zucchini)
- **AND** is named descriptively (e.g., "1 Stück (200g)")

#### Scenario: Plausible rank-1 for spices
- **WHEN** viewing portions for "gemahlener schwarzer Pfeffer"
- **THEN** rank-1 portion has weight_g between 2 and 5 (one teaspoon)
- **AND** is named descriptively (e.g., "1 TL (2g)")

#### Scenario: Plausible rank-1 for liquids
- **WHEN** viewing portions for "Kuhmilch 3,5 % Fett"
- **THEN** rank-1 portion has weight_g of 100 or 200 (100ml or 200ml)
- **AND** uses a liquid measuring unit (ml)

### Requirement: Nonsensical Portions Removed
Portions with meaningless names and weights SHALL be removed from the seed data. This includes "ml" on solid ingredients, "evtl." (parsing artifact), and "Stück"/"Packung"/"Becher"/"Glas" without specified weights.

#### Scenario: Garbage portion removed
- **WHEN** ingredient "Zitrone" has a portion named "ml" with weight_g=1.0
- **THEN** the portion is deleted
- **AND** a proper portion (e.g., "1 Stück (120g)") is added as rank 1

#### Scenario: Gram base portion preserved
- **WHEN** an ingredient has a portion named "g" with weight_g=1.0
- **THEN** the portion is kept at rank=9999 as the free-form gram entry
- **AND** its measuring_unit is the "g" MeasuringUnit

### Requirement: Portion Type Defaults
Ingredients without curated portions SHALL receive type-based default portions derived from their retail section and physical properties.

#### Scenario: Default portions for vegetables
- **WHEN** ingredient is in retail section "Gemüse" and has no curated portions
- **THEN** rank-1 is created as "1 Stück (150g)" with weight_g=150
- **AND** rank-2 is created as "100g" with weight_g=100
- **AND** rank-9999 is "g" (1g) for free-form entry
