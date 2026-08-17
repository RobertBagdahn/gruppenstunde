## MODIFIED Requirements

### Requirement: Ingredient Model (standalone)
The `Ingredient` model SHALL be a standalone Django model (`models.Model`), NOT inheriting from `Supply`. Ingredient has its own fields: name, slug, description, plus nutritional values per 100g (11 macronutrient fields: energy_kj, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g, and 1 micronutrient field: vitamin_c_mg), scores (child_score, scout_score, environmental_score, nova_score, fruit_factor, nutri_score, nutri_class), price_per_kg, physical properties, external references (fdc_id, ean, nan_art_id_rewe), and relations (retail_section FK, nutritional_tags M2M, ingredient_ref self-FK). The separate `Price` model SHALL NOT exist — `price_per_kg` on Ingredient is the sole price field.

#### Scenario: Ingredient detail page
- **WHEN** a user navigates to `/ingredients/:slug`
- **THEN** the page SHALL display: name, description, nutritional values, portions, price_per_kg
- **THEN** a "Wo wird das verwendet" section SHALL list all recipes and meal plans using this ingredient
