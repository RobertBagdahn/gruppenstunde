## MODIFIED Requirements

### Requirement: Tracked micronutrients
The system SHALL track only `vitamin_c_mg` as micronutrient field on Ingredient and Recipe models. All other vitamin and mineral fields (vitamin_a, vitamin_b1, vitamin_b2, vitamin_b6, vitamin_b12, vitamin_d, vitamin_e, vitamin_k, niacin, folate, pantothenic_acid, biotin, calcium, iron, magnesium, zinc, potassium, phosphorus, iodine, selenium, copper, manganese, chromium, fluoride) SHALL be removed.

#### Scenario: Ingredient has only vitamin_c as micronutrient
- **WHEN** an Ingredient is created or edited
- **THEN** only `vitamin_c_mg` is available as micronutrient field (beyond macros)

#### Scenario: Cockpit evaluates only vitamin_c rules
- **WHEN** the cockpit evaluates micronutrient HealthRules for a day
- **THEN** only rules with parameter `vitamin_c_mg` are evaluated

## REMOVED Requirements

### Requirement: Multi-vitamin tracking
**Reason**: Produces alarm fatigue on camp meal plans — almost never achievable, drowns out important signals.
**Migration**: Data in removed fields is lost. Only `vitamin_c_mg` remains. HealthRules referencing removed parameters will be deleted via data migration.

### Requirement: Mineral tracking (calcium, iron, magnesium, etc.)
**Reason**: Not actionable for scout camp meal planning. Creates noise in cockpit.
**Migration**: Same as above — fields removed, HealthRules deleted.
