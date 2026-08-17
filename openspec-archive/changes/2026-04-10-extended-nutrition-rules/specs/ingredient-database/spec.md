## MODIFIED Requirements

### Requirement: Ingredient nutritional data fields
The Ingredient model SHALL store nutritional data per 100g. In addition to the existing 11 fields (energy_kj, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g), the model SHALL include:

**Vitamins (13 fields, all nullable FloatField):**
- `vitamin_a_mg`, `vitamin_b1_mg`, `vitamin_b2_mg`, `vitamin_b6_mg`, `vitamin_b12_ug`
- `vitamin_c_mg`, `vitamin_d_ug`, `vitamin_e_mg`, `vitamin_k_ug`
- `niacin_mg`, `folate_ug`, `pantothenic_acid_mg`, `biotin_ug`

**Minerals (12 fields, all nullable FloatField):**
- `calcium_mg`, `iron_mg`, `magnesium_mg`, `zinc_mg`, `potassium_mg`, `phosphorus_mg`
- `iodine_ug`, `selenium_ug`, `copper_mg`, `manganese_mg`, `chromium_ug`, `fluoride_mg`

All new fields SHALL default to NULL and be grouped in separate Admin fieldsets:
- "Vitamine" fieldset with all 13 vitamin fields
- "Mineralstoffe" fieldset with all 12 mineral fields

#### Scenario: Create ingredient with vitamin data
- **WHEN** a POST request to `/api/ingredients/` includes vitamin_c_mg=53.0 and iron_mg=0.7
- **THEN** the ingredient SHALL be created with those values stored

#### Scenario: Update ingredient mineral data
- **WHEN** a PATCH request to `/api/ingredients/{slug}/` includes calcium_mg=120
- **THEN** the ingredient's calcium_mg SHALL be updated to 120 and a nutri-score recalculation SHALL be triggered

#### Scenario: Admin views ingredient with full nutrition
- **WHEN** an admin views an Ingredient in Django admin
- **THEN** the admin SHALL see four fieldsets: "Nährwerte pro 100g" (Big 7 + Ballaststoffe), "Vitamine", "Mineralstoffe", and "Sonstiges" (fructose, lactose, fruit_factor)

### Requirement: Ingredient API schemas include micronutrients
The `IngredientDetailOut` schema SHALL include all 25 new micronutrient fields (13 vitamins + 12 minerals) as optional float fields. The `IngredientCreateIn` and `IngredientUpdateIn` schemas SHALL also accept these fields as optional inputs.

The `IngredientListOut` schema SHALL NOT include micronutrient fields (to keep list responses lightweight).

#### Scenario: Ingredient detail returns vitamins
- **WHEN** a GET request is made to `/api/ingredients/{slug}/` for an ingredient with vitamin_c_mg=53.0
- **THEN** the response SHALL include `vitamin_c_mg: 53.0` and all other null vitamin fields as `null`

#### Scenario: Ingredient list does not return vitamins
- **WHEN** a GET request is made to `/api/ingredients/`
- **THEN** the response items SHALL NOT contain vitamin or mineral fields
