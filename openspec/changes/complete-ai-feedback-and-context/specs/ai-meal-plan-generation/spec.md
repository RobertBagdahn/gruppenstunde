## MODIFIED Requirements

### Requirement: Meal plan AI suggestion returns interaction ID and season context
The meal plan AI suggestion endpoint SHALL return an `ai_interaction_id` and SHALL include the current season/month in the generated prompt.

#### Scenario: Meal plan suggestions return interaction ID
- **WHEN** `POST /api/meal-plans/ai/suggest/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Season context included in prompt
- **WHEN** a meal plan is generated
- **THEN** the prompt SHALL include the current season or month from the central context block
