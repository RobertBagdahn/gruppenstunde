## ADDED Requirements

### Requirement: Gemini quantity_g values are clamped to plausible range
The `normalize_recipe_portions` management command SHALL clamp Gemini-returned `quantity_g` values to the range [0.1, 5000] grams.

#### Scenario: Value below minimum
- **WHEN** Gemini returns `quantity_g=-5` for a recipe item
- **THEN** the command SHALL skip the item with a warning log message

#### Scenario: Value above maximum
- **WHEN** Gemini returns `quantity_g=99999` for a recipe item
- **THEN** the command SHALL clamp the value to `5000` grams

#### Scenario: Valid value within range
- **WHEN** Gemini returns `quantity_g=150` for a recipe item
- **THEN** the command SHALL use the value as-is without modification

#### Scenario: Zero value
- **WHEN** Gemini returns `quantity_g=0` for a recipe item
- **THEN** the command SHALL skip the item with a warning log message
