## 1. Setup & Dependencies

- [x] 1.1 Add `beautifulsoup4` and `weasyprint` to backend dependencies
- [x] 1.2 Enable `pg_trgm` extension via Django migration

## 2. Unit Conversion

- [x] 2.1 Create `UnitConversion` model in `supply/models/`
- [x] 2.2 Create schema and API endpoint `GET /api/unit-conversions/`
- [x] 2.3 Create seed data migration with common conversions (EL→g, TL→ml, Tasse→ml)
- [x] 2.4 Create Zod schema and TanStack Query hook in frontend

## 3. Ingredient Fuzzy Match

- [x] 3.1 Create `fuzzy_match.py` service in `supply/services/`
- [x] 3.2 Add `GET /api/ingredients/suggest/` endpoint with pg_trgm similarity
- [x] 3.3 Create `UnknownIngredientDialog` frontend component
- [x] 3.4 Integrate dialog into recipe item creation flow

## 4. Ingredient Autocomplete

- [x] 4.1 Create `IngredientAutocomplete` component with ghost-text and dropdown
- [x] 4.2 Add keyboard navigation (Tab accept, arrows, Escape)
- [x] 4.3 Replace existing ingredient inputs in recipe create/edit forms

## 5. Recipe URL Import

- [x] 5.1 Create `import_service.py` with Schema.org JSON-LD parser
- [x] 5.2 Add Chefkoch-specific fallback parser
- [x] 5.3 Create `POST /api/recipes/import-from-url/` endpoint with preview response
- [x] 5.4 Create Pydantic schemas for import request/response
- [x] 5.5 Create `RecipeImportPage` frontend page with URL input and preview
- [x] 5.6 Create Zod schema and API hook for import
- [x] 5.7 Add route and navigation link

## 6. Recipe Folders

- [x] 6.1 Create `RecipeFolder` model with name, owner, sort_order, parent
- [x] 6.2 Add `folder` FK to `Recipe` model
- [x] 6.3 Create CRUD API `/api/recipe-folders/`
- [x] 6.4 Add `?folder=` filter to my-recipes endpoint
- [x] 6.5 Create frontend folder sidebar/tree in MyRecipesPage
- [x] 6.6 Create Zod schema and hooks

## 7. Simple Meal

- [x] 7.1 Add `simple_meal` to `recipe_type` choices
- [x] 7.2 Create migration
- [x] 7.3 Create simplified create/edit form variant in frontend
- [x] 7.4 Add distinct badge in recipe list for simple meals

## 8. MealPlan Erweiterungen (Overrides, Portionen, Notizen, Zutaten)

- [x] 8.1 Add `override_portions`, `note`, `note_is_published` fields to `Meal` model
- [x] 8.2 Add `display_name`, `ingredient` FK, `quantity`, `measuring_unit` FK to `MealItem` model (with constraint: recipe XOR ingredient)
- [x] 8.3 Add SNACK to `DEFAULT_MEAL_TYPES` (4 default slots per day)
- [x] 8.4 Create `MealItemOverride` model in `planner/models/`
- [x] 8.5 Create migration for all planner model changes
- [x] 8.6 Update Pydantic schemas for Meal (override_portions, note, note_is_published) and MealItem (display_name, ingredient, quantity, measuring_unit)
- [x] 8.7 Update API: allow adding ingredients (not just recipes) to meals
- [x] 8.8 Create schema and `PATCH /api/meal-plans/{id}/meal-items/{item_id}/overrides/` endpoint
- [x] 8.9 Include overrides in MealPlan detail response
- [x] 8.10 Update shopping list generation to respect overrides + ingredient-only MealItems
- [x] 8.11 Update nutrition calculation to respect overrides + override_portions
- [x] 8.12 Create override UI in MealPlanDetailPage (inline quantity editing)
- [x] 8.13 Add meal notes UI with publish toggle
- [x] 8.14 Add per-meal portion override UI
- [x] 8.15 Add display_name editing for MealItems
- [x] 8.16 Update Zod schemas and TanStack Query hooks

## 9. Shopping List Views & Print

- [x] 9.1 Add `?view=` query parameter to shopping list items endpoint
- [x] 9.2 Implement summarized view (group by ingredient, sum quantities with unit conversion)
- [x] 9.3 Implement by-recipe view (group items by source recipe)
- [x] 9.4 Create view toggle component in ShoppingListDetailPage
- [x] 9.5 Create `ShoppingListPrintView` with @media print CSS
- [x] 9.6 Add "Drucken" button

## 10. MealPlan PDF Export

- [x] 10.1 Create HTML template for meal plan PDF (with/without notes variants)
- [x] 10.2 Create `pdf_export.py` service using WeasyPrint
- [x] 10.3 Add `GET /api/meal-plans/{id}/export/pdf/?include_notes=true|false` endpoint
- [x] 10.4 Add "PDF exportieren" button in MealPlanDetailPage with option "Mit Notizen" / "Ohne Notizen"
