## ADDED Requirements

### Requirement: Portion-based suggestion evaluation
The suggestion evaluation service SHALL evaluate all nutrition rules at the meal plan, day, and meal levels using aggregated values that have been scaled to a per-person (portion) basis.

#### Scenario: Day cockpit suggestion evaluation uses portion-scaled values
- **WHEN** a day cockpit contains a recipe with 13.5g protein per 100g, weight = 800g, servings = 4, and meal item factor = 1.0 (equivalent to 1 portion of 200g weight containing 27.0g protein)
- **AND** a day-scope rule requires "protein_g >= 45.0"
- **THEN** the suggestion service SHALL evaluate the portion value (27.0g) instead of the per-100g value (13.5g)
- **AND** generate a yellow or red warning suggestion because 27.0g < 45.0g
