## MODIFIED Requirements

### Requirement: Portion and Price relationship simplified

Portion SHALL reference Ingredient directly. The Price model SHALL be removed entirely. Ingredient SHALL store its price via the `price_per_kg` field. Additionally, Portion SHALL have a `rank` field (IntegerField, default=1) to control display ordering. The Portion with the lowest `rank` value (rank=1) SHALL be treated as the default/Normalportion. The `priority` field (IntegerField) and `is_default` field (BooleanField) SHALL be removed from the Portion model.

#### Scenario: Portion for supply.Ingredient

- **WHEN** a Portion is created for an Ingredient
- **THEN** it SHALL reference supply.Ingredient
- **THEN** all weight conversion and measuring unit logic SHALL remain unchanged

#### Scenario: Portionen sortiert nach rank

- **WHEN** Portionen einer Zutat abgefragt werden
- **THEN** SHALL die Sortierung nach `rank` (aufsteigend) erfolgen
- **THEN** SHALL die Portion mit `rank=1` die Normalportion/Default sein

#### Scenario: Kein priority-Feld mehr

- **WHEN** das Portion-Modell inspiziert wird
- **THEN** SHALL kein `priority`-Feld existieren
- **THEN** SHALL kein `is_default`-Feld existieren
- **THEN** SHALL `rank` das einzige Sortierfeld sein

#### Scenario: Price calculation from Ingredient

- **WHEN** a recipe's price needs to be calculated
- **THEN** the system SHALL use `Ingredient.price_per_kg * weight_g / 1000` for each RecipeItem
- **THEN** no Price model lookup SHALL be needed
