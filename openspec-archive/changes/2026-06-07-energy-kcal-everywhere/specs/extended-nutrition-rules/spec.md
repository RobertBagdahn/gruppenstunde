## MODIFIED Requirements

### Requirement: Comprehensive RecipeHint rules for macronutrients
The system SHALL provide at least the following RecipeHint rules for macronutrient evaluation (per 100g values of a recipe), seeded via `seed_all.py`:

**Energie (energy_kcal):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Etwas weniger Energie | energy_kcal | max | 717 | warning | health | Verwende mehr Gemüse und weniger fettreiche Zutaten, um den Energiegehalt zu senken. |
| Viel zu viel Energie | energy_kcal | max | 956 | error | health | Der Energiegehalt ist sehr hoch. Ersetze Sahne durch Milch, Butter durch Olivenöl oder füge mehr Gemüse hinzu. |
| Etwas mehr Energie | energy_kcal | min | 454 | warning | fulfillment | Die Mahlzeit liefert wenig Energie. Ergänze Kohlenhydratquellen wie Kartoffeln, Reis oder Brot. |
| Viel mehr Energie nötig | energy_kcal | min | 358 | error | fulfillment | Die Mahlzeit hat deutlich zu wenig Energie für eine Hauptmahlzeit. Füge sättigende Beilagen hinzu. |

#### Scenario: Recipe with excessive energy triggers warning hint
- **WHEN** a recipe has `cached_energy_kcal > 717` per 100g
- **THEN** the system SHALL return a Rule evaluation with level "warning" and objective "health"

#### Scenario: Recipe with low energy triggers fulfillment hint
- **WHEN** a recipe has `cached_energy_kcal < 454` per 100g
- **THEN** the system SHALL return a Rule evaluation with level "warning" and objective "fulfillment"

### Requirement: RecipeHint rules differentiated by recipe type
RecipeHint rules MAY be filtered by `recipe_type`. The system SHALL apply type-specific thresholds:

**Breakfast-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Frühstück: wenig Energie | energy_kcal | min | 358 | warning | breakfast | fulfillment | Das Frühstück sollte genug Energie für den Vormittag liefern. Ergänze Nüsse oder Käse. |

**Snack-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Snack: zu viel Energie | energy_kcal | max | 358 | warning | snack | health | Ein Snack sollte nicht zu viel Energie haben. Greife zu leichten Alternativen. |

### Requirement: DGE reference values as database model
The system SHALL provide a `DgeReference` model in the supply app with the following fields:
- `age_min` (IntegerField) — Lower bound of age group
- `age_max` (IntegerField) — Upper bound of age group
- `gender` (CharField) — "male" or "female"
- All macronutrient reference values: energy_kcal, protein_g, fat_g, carbohydrate_g, fibre_g
- Micronutrient reference: vitamin_c_mg
- `sugar_g_max` (FloatField) — Maximum recommended sugar per day
- `salt_g_max` (FloatField) — Maximum recommended salt per day
- `fat_sat_g_max` (FloatField) — Maximum recommended saturated fat per day
- `sodium_mg_max` (FloatField) — Maximum recommended sodium per day

The model SHALL be admin-manageable and initially seeded with official DGE D-A-CH reference values. All energy values SHALL be stored in kcal.

#### Scenario: Retrieve DGE reference for age group
- **WHEN** querying DGE references for age 14 and gender "male"
- **THEN** the system SHALL return the matching age group (13-14) reference values
- **THEN** `energy_kcal` SHALL be in kcal (not kJ)
