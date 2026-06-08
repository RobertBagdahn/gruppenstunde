# extended-nutrition-rules Specification

## Purpose
Defines comprehensive RecipeHint rules for macronutrients, RecipeHint rules by type, improvement texts, extended HealthRules for day/meal scope, DGE reference values model, and tracked micronutrients.

## Requirements

### Requirement: Comprehensive RecipeHint rules for macronutrients
The system SHALL provide at least the following RecipeHint rules for macronutrient evaluation (per 100g values of a recipe), seeded via `seed_all.py`:

**Energie (energy_kcal):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Etwas weniger Energie | energy_kcal | max | 717 | warning | health | Verwende mehr Gemüse und weniger fettreiche Zutaten, um den Energiegehalt zu senken. |
| Viel zu viel Energie | energy_kcal | max | 956 | error | health | Der Energiegehalt ist sehr hoch. Ersetze Sahne durch Milch, Butter durch Olivenöl oder füge mehr Gemüse hinzu. |
| Etwas mehr Energie | energy_kcal | min | 454 | warning | fulfillment | Die Mahlzeit liefert wenig Energie. Ergänze Kohlenhydratquellen wie Kartoffeln, Reis oder Brot. |
| Viel mehr Energie nötig | energy_kcal | min | 358 | error | fulfillment | Die Mahlzeit hat deutlich zu wenig Energie für eine Hauptmahlzeit. Füge sättigende Beilagen hinzu. |

**Eiweiß (protein_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Mehr Eiweiß | protein_g | min | 30 | warning | health | Ergänze eiweißreiche Zutaten wie Hülsenfrüchte, Tofu, Eier oder mageres Fleisch. |
| Viel mehr Eiweiß nötig | protein_g | min | 10 | error | health | Der Eiweißgehalt ist sehr niedrig. Füge eine Proteinquelle wie Linsen, Kichererbsen oder Quark hinzu. |
| Zu viel Eiweiß | protein_g | max | 80 | warning | health | Der Eiweißgehalt ist hoch. Bei Hauptmahlzeiten ist das ok, bei Snacks eher ungewöhnlich. |

**Fett (fat_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Hoher Fettgehalt | fat_g | max | 20 | info | health | Der Fettgehalt ist erhöht. Prüfe ob gesättigte Fette durch ungesättigte ersetzt werden können. |
| Viel Fett | fat_g | max | 35 | warning | health | Reduziere fettreiche Zutaten. Ersetze Sahne durch Joghurt oder brate mit weniger Öl. |
| Sehr viel Fett | fat_g | max | 50 | error | health | Der Fettgehalt ist sehr hoch. Verwende fettarme Alternativen und mehr Gemüse. |

**Gesättigte Fettsäuren (fat_sat_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Viel gesättigte Fettsäuren | fat_sat_g | max | 20 | warning | health | Ersetze Butter durch Rapsöl oder Olivenöl und verwende fettarme Milchprodukte. |
| Sehr viel gesättigte Fettsäuren | fat_sat_g | max | 40 | error | health | Der Anteil gesättigter Fettsäuren ist viel zu hoch. Tausche Sahne gegen Kokosmilch light oder verwende Nussmus. |

**Kohlenhydrate (carbohydrate_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Wenig Kohlenhydrate | carbohydrate_g | min | 20 | warning | fulfillment | Ergänze Kohlenhydratquellen wie Vollkornbrot, Kartoffeln oder Hirse für bessere Sättigung. |
| Sehr wenig Kohlenhydrate | carbohydrate_g | min | 10 | error | fulfillment | Die Mahlzeit hat kaum Kohlenhydrate. Für aktive Pfadfinder ist eine gute Kohlenhydratversorgung wichtig. |
| Sehr viele Kohlenhydrate | carbohydrate_g | max | 70 | warning | health | Der Kohlenhydratanteil ist sehr hoch. Prüfe den Zuckeranteil und ersetze ggf. Weißmehl durch Vollkorn. |

**Zucker (sugar_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Viel Zucker | sugar_g | max | 20 | warning | health | Reduziere Zucker. Verwende reifes Obst als natürliche Süße oder ersetze Zucker teilweise durch Apfelmark. |
| Sehr viel Zucker | sugar_g | max | 40 | error | health | Der Zuckergehalt ist viel zu hoch. Halbiere die Zuckermenge oder verwende Alternativen wie Dattelpaste. |
| Hoher Zuckeranteil an KH | sugar_g | max | 15 | info | health | Prüfe ob der Zucker aus natürlichen Quellen (Obst) oder zugesetztem Zucker stammt. |

**Salz (salt_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Zu viel Salz | salt_g | max | 2.0 | warning | health | Verwende weniger Salz und würze stattdessen mit Kräutern, Zitrone oder Gewürzen. |
| Viel zu viel Salz | salt_g | max | 4.0 | error | health | Der Salzgehalt ist gefährlich hoch. Reduziere Fertigprodukte und salze sparsam nach. |

**Natrium (sodium_mg):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Viel Natrium | sodium_mg | max | 500 | warning | health | Reduziere salzhaltige Zutaten wie Käse, Wurst oder Fertigsaucen. |
| Zu viel Natrium | sodium_mg | max | 1000 | error | health | Der Natriumgehalt ist deutlich zu hoch. Verwende frische statt verarbeiteter Zutaten. |
| Wenig Natrium | sodium_mg | min | 300 | warning | health | Etwas Salz ist wichtig für den Elektrolythaushalt, besonders bei aktiven Pfadfindern. |

**Ballaststoffe (fibre_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Mehr Ballaststoffe | fibre_g | min | 3 | info | fulfillment | Ergänze ballaststoffreiche Zutaten wie Vollkornprodukte, Hülsenfrüchte oder Gemüse. |
| Viel mehr Ballaststoffe | fibre_g | min | 1 | warning | health | Der Ballaststoffgehalt ist sehr niedrig. Ersetze weißen Reis durch Vollkornreis oder füge Leinsamen hinzu. |
| Zu wenig Ballaststoffe für Sättigung | fibre_g | min | 5 | warning | fulfillment | Für eine gute Sättigung sollte die Mahlzeit mehr Ballaststoffe enthalten. Verwende Vollkornprodukte. |

**Nutri-Score (nutri_class):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Nicht gesund | nutri_class | max | 2 | warning | health | Der Nutri-Score ist nur mittelmäßig. Erhöhe den Gemüse- und Obstanteil. |
| Ungesundes Rezept | nutri_class | max | 3 | error | health | Der Nutri-Score ist schlecht. Überarbeite die Zusammensetzung grundlegend mit mehr frischen Zutaten. |

**Gewicht (weight_g):**
| Name | Parameter | Min/Max | Value | Level | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-----------|------------------|
| Etwas mehr Gewicht | weight_g | min | 300 | warning | fulfillment | Die Portion ist recht klein. Ergänze Beilagen oder Salat für eine sättigende Mahlzeit. |
| Viel mehr Gewicht | weight_g | min | 200 | error | fulfillment | Die Portionsgröße ist zu gering für eine Hauptmahlzeit. Füge substanzielle Zutaten hinzu. |
| Etwas weniger Gewicht | weight_g | max | 650 | warning | cost | Die Portion ist recht groß. Prüfe ob die Mengen pro Person korrekt sind. |
| Viel Gewicht | weight_g | max | 750 | error | cost | Die Portionsgröße ist sehr groß. Reduziere die Mengen oder teile in Vor- und Hauptspeise auf. |

#### Scenario: Recipe with excessive sugar triggers warning hint
- **WHEN** a recipe has `sugar_g > 20` per 100g
- **THEN** the system SHALL return a RecipeHint with level "warning", objective "health", and improvement text suggesting sugar reduction

#### Scenario: Recipe with low fibre triggers fulfillment hint
- **WHEN** a recipe has `fibre_g < 5` per 100g
- **THEN** the system SHALL return a RecipeHint with level "warning", objective "fulfillment", and improvement text suggesting whole grain products

#### Scenario: Recipe with good nutrition has no warnings
- **WHEN** a recipe has balanced macronutrient values within all thresholds
- **THEN** the system SHALL return no warning or error level hints



### Requirement: RecipeHint rules differentiated by recipe type
RecipeHint rules MAY be filtered by `recipe_type`. The system SHALL apply type-specific thresholds:

**Breakfast-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Frühstück: wenig Ballaststoffe | fibre_g | min | 4 | warning | breakfast | health | Vollkornbrot oder Müsli mit Haferflocken sind ideal für ein ballaststoffreiches Frühstück. |
| Frühstück: zu süß | sugar_g | max | 15 | warning | breakfast | health | Verwende ungesüßtes Müsli und frisches Obst statt Marmelade oder Schoko-Aufstrich. |
| Frühstück: wenig Energie | energy_kcal | min | 358 | warning | breakfast | fulfillment | Das Frühstück sollte genug Energie für den Vormittag liefern. Ergänze Nüsse oder Käse. |

**Snack-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Snack: zu viel Zucker | sugar_g | max | 10 | warning | snack | health | Ersetze süße Snacks durch Obst, Gemüsesticks oder Nüsse. |
| Snack: zu viel Energie | energy_kcal | max | 358 | warning | snack | health | Ein Snack sollte nicht zu viel Energie haben. Greife zu leichten Alternativen. |
| Snack: zu viel Fett | fat_g | max | 15 | warning | snack | health | Wähle fettärmere Snack-Alternativen wie Reiswaffeln oder frisches Obst. |

**Drink-specific rules:**
| Name | Parameter | Min/Max | Value | Level | Recipe Type | Objective | Improvement Text |
|------|-----------|---------|-------|-------|-------------|-----------|------------------|
| Getränk: zu viel Zucker | sugar_g | max | 8 | warning | drink | health | Verwende weniger Zucker oder ersetze durch frische Früchte. Wasser ist immer die beste Wahl. |
| Getränk: viel Zucker | sugar_g | max | 15 | error | drink | health | Der Zuckergehalt ist für ein Getränk viel zu hoch. Verdünne Säfte oder verwende ungesüßte Tees. |

#### Scenario: Breakfast recipe triggers breakfast-specific fibre hint
- **WHEN** a recipe with type "breakfast" has `fibre_g < 4` per 100g
- **THEN** the system SHALL match the breakfast-specific fibre hint (not the generic one)

#### Scenario: Generic rule applies when no type-specific rule exists
- **WHEN** a recipe with type "warm_meal" has `sugar_g > 20` per 100g and no warm_meal-specific sugar rule exists
- **THEN** the system SHALL match the generic sugar warning rule

### Requirement: RecipeHint improvement_text field
The RecipeHint model SHALL have an `improvement_text` field (TextField, blank=True) that contains a concrete, actionable improvement suggestion in German. This field SHALL be separate from the `description` field. Every seeded RecipeHint MUST have an improvement_text.

#### Scenario: Hint with improvement text in API response
- **WHEN** a recipe triggers a RecipeHint that has an improvement_text
- **THEN** the API response SHALL include both the hint description and the improvement_text

### Requirement: Extended HealthRules for cockpit
The system SHALL provide HealthRules for the cockpit dashboard covering macronutrients and vitamin_c_mg. To ensure visual indicators (Soll-Ist-Balken) are always rendered in the frontend, the system MUST use robust static DGE (Deutsche Gesellschaft für Ernährung) target value fallbacks for 13-18 year olds if database rules are empty or still loading. New HealthRules:

**Day scope:**
| Name | Parameter | Green | Yellow | Unit | Tip Text |
|------|-----------|-------|--------|------|----------|
| Vitamin C pro Tag | vitamin_c_mg | 60 | 30 | mg | Mehr frisches Obst und Gemüse einplanen, z.B. Paprika oder Orangensaft zum Frühstück. |
| Ballaststoffe pro Tag | fibre_g | 25 | 15 | g | Mehr Vollkornprodukte, Gemüse und Hülsenfrüchte einplanen. |
| Protein pro Tag | protein_g | 46 | 30 | g | Ausreichend Proteinquellen über den Tag verteilen: Milchprodukte, Hülsenfrüchte, Eier. |
| Fett pro Tag | fat_g | 70 | 90 | g | Fettgehalt der Mahlzeiten prüfen. Frittiertes und Sahnesoßen reduzieren. |
| Salz pro Tag | salt_g | 5 | 8 | g | Weniger salzige Fertigprodukte und mehr frisch kochen. |

**Meal scope (additional):**
| Name | Parameter | Green | Yellow | Unit | Tip Text |
|------|-----------|-------|--------|------|----------|
| Vitamin C pro Mahlzeit | vitamin_c_mg | 20 | 10 | mg | Frisches Gemüse oder Obst als Beilage servieren. |
| Ballaststoffe pro Mahlzeit | fibre_g | 8 | 4 | g | Vollkornprodukte statt Weißmehlprodukte verwenden. |
| Salzgehalt pro Mahlzeit | salt_g | 2 | 3 | g | Weniger nachsalzen und mehr mit Kräutern würzen. |

#### Scenario: Day cockpit shows vitamin C warning
- **WHEN** a meal day has total vitamin_c_mg below 30
- **THEN** the cockpit SHALL show a yellow status for the Vitamin C rule with the improvement tip

#### Scenario: All day nutrients in green range
- **WHEN** a meal day meets all nutrient thresholds for green status
- **THEN** the cockpit SHALL show all-green summary with green_count equal to total rule count

#### Scenario: Day cockpit uses static fallback rules
- **WHEN** database rules are empty or loading and the user views the day nutrition dashboard
- **THEN** the cockpit SHALL display the target range comparison (SollIstBar) using the static DGE fallback guidelines

#### Scenario: Day cockpit uses database rules when available
- **WHEN** database rules are successfully loaded and the user views the day nutrition dashboard
- **THEN** the cockpit SHALL display the target range comparison (SollIstBar) using the loaded database rules

### Requirement: Nutrient balance chart with target values
The nutrient balance chart (NutrientBalanceChart) SHALL display side-by-side or grouped visual comparison between the actual nutrient intake (Ist) and the recommended target ranges/values (Soll). The chart MUST represent the target values for each displayed parameter (Eiweiß, Fett, Kohlenhydrate, Zucker, Ballaststoffe, Salz).

#### Scenario: Nutrient balance chart shows comparison
- **WHEN** the user views the nutrition tab
- **THEN** the NutrientBalanceChart SHALL render two separate bars/values for each nutrient parameter (one for Ist, one for Soll)

#### Scenario: Chart tooltip includes target ranges
- **WHEN** the user hovers over a nutrient column in the chart
- **THEN** the tooltip SHALL display both the actual value (Ist) and the recommended target/range value (Soll)


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

The model SHALL be admin-manageable and initially seeded with official DGE D-A-CH reference values.

#### Scenario: Retrieve DGE reference for age group
- **WHEN** querying DGE references for age 14 and gender "male"
- **THEN** the system SHALL return the matching age group (13-14) reference values

#### Scenario: List all DGE references via API
- **WHEN** a GET request is made to `/api/dge-references/`
- **THEN** the system SHALL return all DGE reference entries as a flat list

#### Scenario: Admin edits DGE reference
- **WHEN** an admin modifies a DGE reference value in the Django admin
- **THEN** the updated value SHALL be used in all subsequent DGE calculations



### Requirement: Extended nutrition breakdown API
The nutrition breakdown endpoint (`GET /api/recipes/{id}/nutrition-breakdown/`) SHALL include vitamin_c_mg data in addition to macronutrients. The totals SHALL include per-serving values and DGE percentage coverage for vitamin_c_mg.

#### Scenario: Nutrition breakdown with DGE coverage
- **WHEN** a GET request is made to `/api/recipes/{id}/nutrition-breakdown/` with optional query parameter `age=14&gender=male`
- **THEN** the response SHALL include a `dge_coverage` object with percentage values for macronutrients and vitamin_c_mg relative to the DGE reference for the specified age/gender group

#### Scenario: Nutrition breakdown without age parameter
- **WHEN** a GET request is made to `/api/recipes/{id}/nutrition-breakdown/` without age/gender parameters
- **THEN** the response SHALL use the default age group 13-14 male (typical Pfadfinder) for DGE coverage calculation

### Requirement: Tracked micronutrients
The system SHALL track only `vitamin_c_mg` as micronutrient field on Ingredient and Recipe models. All other vitamin and mineral fields (vitamin_a, vitamin_b1, vitamin_b2, vitamin_b6, vitamin_b12, vitamin_d, vitamin_e, vitamin_k, niacin, folate, pantothenic_acid, biotin, calcium, iron, magnesium, zinc, potassium, phosphorus, iodine, selenium, copper, manganese, chromium, fluoride) SHALL be removed.

#### Scenario: Ingredient has only vitamin_c as micronutrient
- **WHEN** an Ingredient is created or edited
- **THEN** only `vitamin_c_mg` is available as micronutrient field (beyond macros)

#### Scenario: Cockpit evaluates only vitamin_c rules
- **WHEN** the cockpit evaluates micronutrient HealthRules for a day
- **THEN** only rules with parameter `vitamin_c_mg` are evaluated
