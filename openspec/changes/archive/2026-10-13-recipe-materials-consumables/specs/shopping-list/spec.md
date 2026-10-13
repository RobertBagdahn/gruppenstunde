## ADDED Requirements

### Requirement: Consumables on the shopping list
When creating a shopping list, the system SHALL accept `include_consumables` (default `true`). If true, consumable materials of the source recipes MUST be added as items in a separate section "Verbrauchsmaterial" at the end of the list, with the scaled piece count and no package rounding. Devices MUST never be added.

#### Scenario: Consumables included by default
- **WHEN** a list is created from a plan with 40 required Pappteller
- **THEN** the section "Verbrauchsmaterial" contains "Pappteller 40 Stück"

#### Scenario: Opt-out
- **WHEN** the list is created with `include_consumables=false`
- **THEN** no consumable items are created

#### Scenario: Device not listed
- **WHEN** a recipe needs a Backofen
- **THEN** it is not on the shopping list

#### Scenario: Check off
- **WHEN** a collaborator checks "Pappteller"
- **THEN** it behaves like any other item, with sources listing the recipes
