## MODIFIED Requirements

### Requirement: Recipe search results display
The RecipeSearchDialog SHALL show a "Beliebteste Rezepte" section before search results when no search query is active, displaying 5-8 recipes split into personal and community rankings filtered by the current meal_type.

#### Scenario: Dialog opens with no search query
- **WHEN** the RecipeSearchDialog opens and no search text is entered
- **THEN** a "Beliebteste" section SHALL be displayed showing up to 8 personal favorites and up to 8 community hits, filtered by the meal's meal_type

#### Scenario: User types search query
- **WHEN** the user enters a search query (≥2 chars)
- **THEN** the "Beliebteste" section SHALL be hidden and regular search results SHALL be shown

#### Scenario: User clears search query
- **WHEN** the user clears the search input back to empty
- **THEN** the "Beliebteste" section SHALL reappear

### Requirement: Extended search response schema
The recipe search response SHALL include additional preview fields for each recipe: image, servings, cached_energy_kj, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_price_total, cached_nutri_class, nutritional_tags (array of {id, name}), usage_count, description (truncated to 200 chars), and ingredients_preview (array of strings, max 8).

#### Scenario: Full recipe data available
- **WHEN** a recipe has all cached fields populated
- **THEN** the search response SHALL include all preview fields with their values

#### Scenario: Recipe with null cached fields
- **WHEN** a recipe has null cached_energy_kj or cached_price_total
- **THEN** those fields SHALL be returned as null in the response
