# ai-meal-plan-generation Specification

## Purpose

KI-gestützte Essensplan-Generierung mit Kandidaten-Injektion, Multi-Item-Frühstücken aus bestehenden Mahlzeiten, 100 % Vollständigkeitsgarantie durch Auto-Fill-Fallback und strikter Mahlzeitentyp-Plausibilität.

## Requirements

### Requirement: Candidate catalog injection in AI meal plan prompt

The system SHALL retrieve approved candidate recipes and structured breakfast meal compositions from the database and inject their identifiers, titles, and relevant traits directly into the prompt provided to Gemini. The LLM prompt MUST forbid guessing arbitrary recipe IDs and instruct the model to choose exclusively from the provided candidates.

#### Scenario: Prompt contains real candidate IDs and titles
- **WHEN** an authenticated user calls `POST /api/meal-plans/ai/suggest/`
- **THEN** the prompt sent to Gemini contains a structured list of available breakfast meals and recipe candidates (IDs, titles, and recipe types)
- **AND** the AI model selects solely from the supplied candidate IDs

#### Scenario: Unauthenticated suggestion request rejected
- **WHEN** an unauthenticated user calls `POST /api/meal-plans/ai/suggest/`
- **THEN** the system SHALL reject the request with HTTP 403

### Requirement: Breakfasts sourced from existing meals and reference setups

The system SHALL source breakfast options from established multi-item breakfast meals (meals with `meal_type='breakfast'` and items) and reference meals in the database. When suggesting a breakfast, the system MUST return the source meal identity and its constituent items (e.g. bread types, spreads, dairy, fruit). Single-dish dessert or snack recipes (such as isolated cookies or sweet spreads) SHALL NOT be suggested as standalone breakfasts.

#### Scenario: Breakfast suggestion returns structured meal composition
- **WHEN** AI suggestions are generated
- **THEN** each suggested day's breakfast contains a plausible breakfast composition sourced from an existing meal or breakfast template
- **AND** the response includes the component items of the breakfast

### Requirement: 100% Slot completeness and auto-fill fallback

The system SHALL guarantee that every day within the specified timeframe contains all required meal slots (breakfast, lunch, and dinner, plus snack if requested). If the LLM omits a slot or returns an invalid or non-matching ID, the system MUST automatically fill the empty slot with a context-appropriate approved recipe or fallback breakfast without dropping the slot.

#### Scenario: AI omits or invalidates lunch slot
- **WHEN** the LLM response is missing a lunch slot or returns an invalid ID for that day
- **THEN** the system SHALL auto-fill the lunch slot with a suitable approved warm or cold meal
- **AND** the resulting plan returned to the client contains a complete set of meals for every requested day

### Requirement: Strict meal-type and child-friendliness plausibility

The system SHALL validate that suggested recipes match the required meal slot type:
- Breakfast slots MUST only contain breakfast compositions or recipes of type `breakfast`.
- Lunch and dinner slots MUST only contain recipes of type `warm_meal` or `cold_meal`.
- Consecutive days SHALL NOT repeat the exact same lunch or dinner recipe.
- When the user prompt indicates children ("Kinder", "Wölflinge", "Jungpfadfinder"), the candidate scoring MUST prioritize child-friendly, camp-tested, and popular dishes over complex or niche recipes.

#### Scenario: Child prompt prioritizes child-friendly camp classics
- **WHEN** the user prompt includes "für Kinder"
- **THEN** the candidate list and suggestions prioritize proven camp classics (e.g. Nudeln, Kartoffelgerichte, Pfannkuchen) with high popularity and suitable age-group suitability

#### Scenario: Meal type mismatch is prevented
- **WHEN** candidate recipes are assembled for lunch and dinner
- **THEN** recipes of type `breakfast`, `dessert`, or `drink` are excluded from lunch and dinner slots

### Requirement: Multi-item breakfast application to meal plans

When applying AI suggestions via `POST /api/meal-plans/{id}/apply-ai/`, the system SHALL create `MealItem`s for all components of the breakfast (including ingredients and sub-recipes) and attach them to the corresponding `Meal` slot. For lunch and dinner, it SHALL attach the selected recipe with `factor=1.0`.

#### Scenario: Applying suggestions creates full breakfast items
- **WHEN** an authenticated user with edit permissions calls `POST /api/meal-plans/{id}/apply-ai/` with structured breakfast suggestions
- **THEN** the target breakfast `Meal` is populated with all constituent items from the suggestion
- **AND** the target lunch and dinner `Meal`s receive their respective recipes

#### Scenario: Unauthorized apply request rejected
- **WHEN** a user without edit permissions calls `POST /api/meal-plans/{id}/apply-ai/`
- **THEN** the system SHALL reject the request with HTTP 403

### Requirement: Meal plan AI suggestion returns interaction ID and season context

The meal plan AI suggestion endpoint SHALL return an `ai_interaction_id` and SHALL include the current season/month in the generated prompt.

#### Scenario: Meal plan suggestions return interaction ID
- **WHEN** `POST /api/meal-plans/ai/suggest/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Season context included in prompt
- **WHEN** a meal plan is generated
- **THEN** the prompt SHALL include the current season or month from the central context block
