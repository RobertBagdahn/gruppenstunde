# ingredient-database Specification

## Purpose

This specification defines the ingredient data model, API schemas, permissions, and frontend behavior for the ingredient database feature.
## Requirements
### Requirement: Ingredient is standalone model
Ingredient SHALL be a standalone Django model (`models.Model`), NOT inheriting from the abstract `Supply` base class. This is because Ingredient has 30+ nutritional/score fields that have nothing in common with Supply (which provides name, slug, description, image). The model SHALL live in the `supply` app. `price_per_kg` (DecimalField) SHALL be the sole price field — no separate Price model.

The model SHALL include the following new fields for data quality and search:
- `embedding` (VectorField, dimensions=768, nullable, default NULL) — pgvector embedding for duplicate detection
- `embedding_updated_at` (DateTimeField, nullable, default NULL)
- `search_vector` (SearchVectorField, nullable, default NULL) — PostgreSQL full-text search
- `quality_score` (IntegerField, nullable, default NULL, validators=[0..100]) — data completeness score
- `quality_score_updated_at` (DateTimeField, nullable, default NULL)

#### Scenario: Ingredient has price_per_kg as only price field
- **WHEN** an Ingredient is created or updated
- **THEN** `price_per_kg` SHALL be settable directly on the Ingredient
- **THEN** there SHALL be no separate Price model or Price table

#### Scenario: Ingredient does not inherit Supply fields
- **WHEN** Ingredient model is inspected
- **THEN** it SHALL NOT have inherited fields from Supply (no automatic slug, image, soft_delete from Supply)
- **THEN** it SHALL define its own name, slug, description fields directly

#### Scenario: Ingredient has embedding and quality fields
- **WHEN** an Ingredient is saved with data changes affecting the embedding text
- **THEN** an embedding vector SHALL be generated and stored
- **THEN** `quality_score` SHALL be calculated from field completeness

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

### Requirement: Ingredient synonyms (aliases)
IngredientAlias SHALL remain directly linked to Ingredient. The model stores alternative names for search and display purposes.

#### Scenario: Searching by synonym
- **WHEN** a user searches for "Tomate"
- **THEN** the search SHALL also match IngredientAlias entries (e.g., "Paradeiser")
- **THEN** the Ingredient detail page SHALL display all aliases

### Requirement: Ingredient nutritional values and scores
Ingredient SHALL store all nutritional values per 100g directly on the model: energy_kcal, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g. Scores SHALL include: nutri_score (points), nutri_class (1-5), child_score, scout_score, environmental_score, nova_score, fruit_factor.

In addition to the existing 11 macronutrient fields, the model SHALL include exactly one micronutrient: `vitamin_c_mg` (nullable FloatField, default NULL). All other vitamin and mineral fields SHALL be removed.

The model SHALL also include six Pfadfinder-relevant fields:
- `storage_type` (CharField, choices: dry/refrigerated/frozen/ambient, nullable, default NULL)
- `cooking_factor` (FloatField, default=1.0, nullable)
- `camp_suitable` (BooleanField, default=False)
- `preparation_time_min` (IntegerField, nullable, default NULL)
- `season_start` (IntegerField, nullable, 1–12, default NULL)
- `season_end` (IntegerField, nullable, 1–12, default NULL)

#### Scenario: Ingredient with full nutritional profile
- **WHEN** an Ingredient is viewed on its detail page
- **THEN** all nutritional values per 100g SHALL be displayed
- **THEN** Nutri-Score class SHALL be shown as a colored badge (A-E)
- **THEN** all scores SHALL be displayed with visual indicators

#### Scenario: Ingredient with scout fields
- **WHEN** an Ingredient with scout field values is viewed
- **THEN** storage_type SHALL be displayed as the German label (e.g. "Kühlschrank")
- **THEN** cooking_factor SHALL be displayed as "aus 100g roh → {X}g gekocht"
- **THEN** camp_suitable SHALL display a badge/icon when true
- **THEN** preparation_time_min SHALL be displayed as "{X} Min." when set
- **THEN** season SHALL be displayed as month range or "ganzjährig"

#### Scenario: AI ingredient import
- **WHEN** the AI service creates/enriches an ingredient
- **THEN** macros, vitamin_c_mg, and all scout fields are requested and stored

#### Scenario: Ingredient schema validation
- **WHEN** an ingredient is submitted via API
- **THEN** macros, vitamin_c_mg, and all scout fields are accepted as valid fields

### Requirement: DGE reference values
The DGE reference model and static data SHALL only include `vitamin_c_mg` as micronutrient reference. All other vitamin/mineral reference fields SHALL be removed.

#### Scenario: Norm portion calculation
- **WHEN** norm portion nutritional targets are calculated
- **THEN** only `vitamin_c_mg` is included as micronutrient target

### Requirement: Supply-aware AI autocomplete
The AI autocomplete for ingredient data SHALL also suggest Material entries when relevant (e.g., suggesting "Schneidebrett" when creating a recipe that involves chopping).

#### Scenario: AI suggests kitchen equipment
- **WHEN** a user creates a Recipe and the AI analyzes the description
- **THEN** the AI MAY suggest relevant Materials (kitchen equipment) in addition to Ingredients
- **THEN** suggested Materials SHALL appear in the "Küchengeräte" section

### Requirement: Zutatenpreise pflegen

Alle Basis-Zutaten MUST einen realistischen `price_per_kg` Wert haben.

#### Scenario: Preis bei Seed-Zutaten
- **WHEN** eine Zutat über das Seed-Command erstellt wird
- **THEN** MUSS `price_per_kg` mit einem realistischen deutschen Supermarkt-Durchschnittspreis befüllt sein (Stand 2024/2025)

#### Scenario: Preis-Anzeige im Frontend
- **WHEN** ein Rezept Zutaten mit `price_per_kg` hat
- **THEN** MUSS der `cached_price_total` über den bestehenden `recalculate_recipe_cache` automatisch berechnet werden
- **THEN** MUSS die Preisanzeige auf der Rezept-Detailseite den berechneten Gesamtpreis anzeigen

### Requirement: Ingredient tracks creator
The Ingredient model SHALL have a `created_by` field (nullable ForeignKey to User) that records which user created the ingredient.

#### Scenario: New ingredient is created via API
- **WHEN** an authenticated user creates an ingredient via `POST /api/ingredients/`
- **THEN** the `created_by` field MUST be set to the authenticated user

#### Scenario: Existing ingredients without creator
- **WHEN** an ingredient has `created_by = NULL`
- **THEN** only staff users SHALL be able to edit or delete it

### Requirement: Role-based edit permission
The system SHALL restrict ingredient update and delete to users who are either the creator or have `is_staff=True`.

#### Scenario: Creator edits their ingredient
- **WHEN** the creator of an ingredient sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST allow the update

#### Scenario: Staff edits any ingredient
- **WHEN** a staff user sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST allow the update

#### Scenario: Non-creator non-staff attempts edit
- **WHEN** a user who is neither creator nor staff sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST return HTTP 403

#### Scenario: Non-creator non-staff attempts delete
- **WHEN** a user who is neither creator nor staff sends `DELETE /api/ingredients/{slug}/`
- **THEN** the system MUST return HTTP 403

### Requirement: Frontend edit visibility
The frontend SHALL only show edit/delete controls when `can_edit` or `can_delete` is `true` in the API response. The frontend SHALL NOT compute edit permissions by comparing `user.id === created_by_id` or checking `user.is_staff` client-side.

#### Scenario: Creator views their ingredient detail
- **WHEN** the ingredient creator views `/ingredients/:slug`
- **THEN** `can_edit` SHALL be `true` in the API response
- **THEN** edit and delete buttons SHALL be visible in the header
- **THEN** PortionCard edit/delete buttons SHALL be visible
- **THEN** Portion drag handles (GripVertical) SHALL be visible
- **THEN** DndContext for portion reordering SHALL be active

#### Scenario: Regular user views another user's ingredient
- **WHEN** a non-staff user who is not the creator views `/ingredients/:slug`
- **THEN** `can_edit` SHALL be `false` in the API response
- **THEN** edit and delete buttons in the header SHALL NOT be visible
- **THEN** PortionCard edit/delete buttons SHALL NOT be visible
- **THEN** Portion drag handles SHALL NOT be visible
- **THEN** DndContext SHALL NOT be active (no drag-and-drop)

#### Scenario: Regular user views ingredient list
- **WHEN** a non-staff user views `/ingredients`
- **THEN** delete buttons on ingredient cards SHALL NOT be visible for ingredients where `can_delete` is `false`
- **THEN** delete buttons on ingredient cards SHALL be visible for ingredients where `can_delete` is `true`

### Requirement: API exposes created_by_id
The ingredient API response schema SHALL include `created_by_id: int | null`.

#### Scenario: Ingredient detail response
- **WHEN** a client fetches `GET /api/ingredients/{slug}/`
- **THEN** the response MUST include `created_by_id` (integer or null)

### Requirement: REWE Artikelnummer über API exponieren
Das Feld `nan_art_id_rewe` SHALL be included in the ingredient API response and request schemas.

#### Scenario: Ingredient abrufen mit REWE Artikelnummer
- **WHEN** ein Ingredient mit gesetzter `nan_art_id_rewe` über GET `/api/supply/ingredients/{id}` abgerufen wird
- **THEN** enthält die Response das Feld `nan_art_id_rewe` mit dem gespeicherten Wert

#### Scenario: Ingredient ohne REWE Artikelnummer
- **WHEN** ein Ingredient ohne `nan_art_id_rewe` abgerufen wird
- **THEN** ist `nan_art_id_rewe` im Response `null`

#### Scenario: Ingredient erstellen/bearbeiten mit REWE Artikelnummer
- **WHEN** ein Ingredient via POST/PATCH mit `nan_art_id_rewe` erstellt/bearbeitet wird
- **THEN** wird der Wert gespeichert

### Requirement: REWE Artikelnummer im UI anzeigen
The ingredient detail page SHALL display the `nan_art_id_rewe` value when present.

#### Scenario: Detail-Seite mit REWE Artikelnummer
- **WHEN** ein Ingredient mit `nan_art_id_rewe` auf der Detail-Seite angezeigt wird
- **THEN** erscheint im Referenzen-Block eine Zeile "REWE Artikelnr." mit dem Wert

#### Scenario: Detail-Seite ohne REWE Artikelnummer
- **WHEN** `nan_art_id_rewe` null ist
- **THEN** wird die Zeile nicht angezeigt

### Requirement: REWE Artikelnummer im Formular editierbar
The ingredient create/edit form SHALL include an input field for `nan_art_id_rewe`.

#### Scenario: Create/Edit-Formular
- **WHEN** das Ingredient-Formular angezeigt wird
- **THEN** gibt es ein Eingabefeld für "REWE Artikelnr." im Referenzen-Abschnitt

### Requirement: Ingredients used in meal plans have price data
The system SHALL ensure that all ingredients actively used in meal plan recipes have a `price_per_kg` value, either from manual entry or automated estimation.

#### Scenario: Run price estimation for unpricied ingredients
- **WHEN** the `estimate_ingredient_prices` command is executed
- **THEN** it SHALL assign estimated `price_per_kg` values to all ingredients that are referenced by at least one RecipeItem but currently have `price_per_kg = NULL`

#### Scenario: Estimation uses realistic German supermarket prices
- **WHEN** estimating a price for an ingredient
- **THEN** the estimated value SHALL be within realistic range for German retail (0.49–20.00 €/kg depending on category)

### Requirement: Scout field display on ingredient detail page
The `IngredientDetailPage` SHALL display all six scout fields in an organized section (grouped with physical properties or in their own "Lager & Pfadfinder" section).

#### Scenario: Scout fields section visible
- **WHEN** viewing an ingredient detail page
- **THEN** the scout fields (storage_type, cooking_factor, camp_suitable, preparation_time_min, season_start/end) SHALL be displayed
- **THEN** fields with NULL values SHALL be hidden or shown as "–"

#### Scenario: camp_suitable indicator
- **WHEN** an ingredient has `camp_suitable=true`
- **THEN** a tent/camp icon or badge SHALL be displayed near the ingredient name

### Requirement: API exposes can_edit and can_delete
The ingredient API response schemas (`IngredientDetailOut` and `IngredientListItemOut`) SHALL include `can_edit: bool` and `can_delete: bool` fields resolved server-side via `_can_edit_ingredient()` and the existing delete permission logic. The `created_by_id` field SHALL remain in the schema for display purposes.

#### Scenario: Ingredient detail response includes permission fields
- **WHEN** a client fetches `GET /api/ingredients/{slug}/`
- **THEN** the response MUST include `can_edit` (boolean) and `can_delete` (boolean)

#### Scenario: Ingredient list response includes permission fields
- **WHEN** a client fetches `GET /api/ingredients/`
- **THEN** each item in the response MUST include `can_edit` and `can_delete`

### Requirement: Recipes-with-ingredient section reuses RecipeCard
On `IngredientDetailPage`, the "Rezepte mit dieser Zutat" section (`RecipesSection`) SHALL render each recipe using the shared `RecipeCard` component instead of a bespoke minimal card, and SHALL display recipe images (or the shared fallback) consistently with the rest of the recipe list pages.

#### Scenario: Recipe with an image is displayed
- **WHEN** the "Rezepte mit dieser Zutat" section renders a recipe that has an uploaded image
- **THEN** the recipe SHALL be displayed via `RecipeCard`, showing the recipe's image with `object-cover`

#### Scenario: Recipe without an image shows the shared fallback
- **WHEN** the "Rezepte mit dieser Zutat" section renders a recipe without an image
- **THEN** `RecipeCard` SHALL display the placeholder image `/images/inspi_cook.png` (via `RecipeThumbnail`), not an icon-only fallback

#### Scenario: Section retains existing empty and loading states
- **WHEN** no recipes reference the ingredient, or the recipes are still loading
- **THEN** the existing empty-state message ("Noch kein Rezept mit dieser Zutat") and loading skeleton SHALL continue to be displayed unchanged

#### Scenario: Mobile layout remains usable at 320px
- **WHEN** the "Rezepte mit dieser Zutat" section is rendered on a 320px-wide viewport
- **THEN** the `RecipeCard` grid SHALL remain legible and MUST NOT overflow horizontally, adjusting the number of grid columns if needed

### Requirement: Complete Nutritional Data for All Ingredients
Every ingredient in the seed data SHALL have complete macronutrient values (energy_kcal, protein_g, fat_g, carbohydrate_g, sugar_g, fibre_g, salt_g) and a price_per_kg, except for categories where zero values are scientifically correct (spices, herbs, water, vinegar).

#### Scenario: Staple food has complete data
- **WHEN** viewing ingredient "Deutsche Markenbutter"
- **THEN** energy_kcal > 0
- **AND** protein_g, fat_g, carbohydrate_g are set
- **AND** price_per_kg is set

#### Scenario: Spice has legitimate zero energy
- **WHEN** viewing ingredient "gemahlener schwarzer Pfeffer"
- **THEN** energy_kcal may be near zero (used in small quantities)
- **AND** all fields are explicitly set (not null)

#### Scenario: Water has zero price
- **WHEN** viewing ingredient "Leitungswasser"
- **THEN** energy_kcal is 0.0
- **AND** price_per_kg is 0.0 (explicitly set, not null)

### Requirement: Ingredient Name Must Be Specific
Every ingredient name SHALL be a concrete, specific product description. Generic single-word names without qualifiers are not permitted as ingredient names.

#### Scenario: Concrete name required
- **WHEN** creating or seeding an ingredient
- **THEN** name MUST include qualifiers if the base term is generic (e.g. "gemahlener schwarzer Pfeffer" not "Pfeffer")
- **AND** generic terms are handled via IngredientAlias with is_generic=True

