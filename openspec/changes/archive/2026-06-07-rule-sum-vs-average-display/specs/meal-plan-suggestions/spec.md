## ADDED Requirements

### Requirement: SuggestionCard displays evaluation scope as visible badge

The `SuggestionCard` component SHALL display the evaluation scope prominently as a colored badge above the suggestion message. For `category="nutrition"` suggestions, the badge SHALL indicate whether the evaluation is a sum (`scope=day`) or an average (`scope=meal_event`).

#### Scenario: Day-scope suggestion shows "Summe" badge

- **WHEN** a nutrition suggestion has `scope="day"` and `scope_label="Tag 3: Energie"`
- **THEN** the SuggestionCard SHALL display a badge with text "Summe Tag 3" above the message
- **AND** the badge SHALL use `day`-scope styling (e.g. blue tint)

#### Scenario: Event-scope suggestion shows "Ø Plan" badge

- **WHEN** a nutrition suggestion has `scope="meal_event"` or `scope="event"` and `scope_label="Gesamt: Energie (Durchschnitt)"`
- **THEN** the SuggestionCard SHALL display a badge with text "Ø Plan" above the message
- **AND** the badge SHALL use `event`-scope styling (e.g. orange tint)

#### Scenario: Non-nutrition suggestions use category badge

- **WHEN** a suggestion has `category="completeness"` or `category="budget"` or `category="duplicate"`
- **THEN** the SuggestionCard SHALL display the `scope_label` as-is without a scope-type prefix badge
- **AND** the badge SHALL use category-appropriate styling

#### Scenario: Meal-scope suggestion shows "Mahlzeit" badge

- **WHEN** a nutrition suggestion has `scope="meal"` and `scope_label="Tag 2 Mittagessen: Energie (Mahlzeit)"`
- **THEN** the SuggestionCard SHALL display a badge with text "Mahlzeit" above the message
- **AND** the badge SHALL use `meal`-scope styling (e.g. green tint)
