## ADDED Requirements

### Requirement: Portion-based nutrition cockpit aggregation
The cockpit aggregation service SHALL calculate nutritional values pro person/serving by scaling each recipe's cached per-100g values using both the recipe's portion scale and the meal item's planned factor.

#### Scenario: Aggregating meal values with portion scaling
- **WHEN** a meal has a meal item for a recipe with cached_protein_g = 10.0g (per 100g), cached_weight_g = 800g, servings = 4, and meal item factor = 1.5
- **THEN** the aggregated meal protein contribution SHALL be calculated as 10.0 * ((800 / 100.0) / 4) * 1.5 = 30.0g per person
