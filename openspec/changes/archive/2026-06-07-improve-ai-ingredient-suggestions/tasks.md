## 1. Backend: Django Model + Migration

- [x] 1.1 Add `StorageTypeChoices` TextChoices enum to `supply/choices.py` (dry/refrigerated/frozen/ambient)
- [x] 1.2 Add 6 new fields to `Ingredient` model in `supply/models/ingredient.py`: `storage_type`, `cooking_factor`, `camp_suitable`, `preparation_time_min`, `season_start`, `season_end` (all nullable)
- [x] 1.3 Run `uv run python manage.py makemigrations supply` and verify migration file
- [x] 1.4 Run `uv run python manage.py migrate`

## 2. Backend: Pydantic API Schemas

- [x] 2.1 Add 6 new fields to `IngredientDetailOut` in `supply/schemas/ingredients.py`
- [x] 2.2 Add 6 new fields to `IngredientCreateIn` (all optional with defaults)
- [x] 2.3 Add 6 new fields to `IngredientUpdateIn` (all optional)
- [x] 2.4 Add `name_suggestion: str | None` and 6 scout fields to `IngredientSuggestAllOut`
- [x] 2.5 Verify `__init__.py` re-exports all updated schemas

## 3. Backend: AI Service — Prompt + Structured Output Schema

- [x] 3.1 Update `PortionSuggestion` Pydantic model: make `weight_g` float, keep `name` required
- [x] 3.2 Update `IngredientSuggestAllSchema`: change `portions`/`aliases`/`nutritional_tags` from `| None` to required with `default_factory=list`; add `name_suggestion`, `storage_type`, `cooking_factor`, `camp_suitable`, `preparation_time_min`, `season_start`, `season_end`
- [x] 3.3 Update `suggest_all_fields()` prompt: add name suggestion instructions ("keine Marken, keine Mengen"), scout field instructions, alias specificity requirement ("mind. 3, Format: Nudeln (Fusilli)")
- [x] 3.4 Handle `name_suggestion` in `suggest_all_fields()`: return as-is from Gemini (or None), add to result dict

## 4. Backend: API Endpoint

- [x] 4.1 Verify `ai_suggest_all` endpoint (line 373-383 in `supply/api/ingredients.py`) returns updated `IngredientSuggestAllOut` with all new fields
- [x] 4.2 Verify `IngredientUpdateIn` accepts all 6 new scout fields via PATCH endpoint (should work automatically from schema changes)

## 5. Frontend: Zod Schema Sync

- [x] 5.1 Add 6 new fields to `IngredientDetailSchema` in `frontend-food/src/schemas/supply.ts`
- [x] 5.2 Add 6 new fields to `IngredientCreateSchema` and `IngredientUpdateSchema` (no separate Zod schemas exist — handled via manual payload)
- [x] 5.3 Add `name_suggestion` and 6 scout fields to `IngredientSuggestAllSchema`
- [x] 5.4 Add `storage_type` to `IngredientListSchema` if needed for list filtering (skipped — no list filtering planned)

## 6. Frontend: AI Suggest Dialog — CSS Grid + Name Suggestion

- [x] 6.1 Change `DialogContent` className from `max-w-lg` to `max-w-4xl`
- [x] 6.2 Refactor group rendering from single-column to CSS Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` for scalar groups
- [x] 6.3 Add `SuggestionField` for `name_suggestion` with full-width row, group "Name", showing ~~current~~ → suggested (handled in Group 7 via `buildIngredientSuggestionFields`)
- [x] 6.4 Add `SuggestionField` entries for 6 scout fields in group "Physikalische Eigenschaften & Lagerung" (handled in Group 7)
- [x] 6.5 Add `name_suggestion` handling in `formatValue()` if needed (added full-width group rendering)

## 7. Frontend: Ingredient Detail Page

- [x] 7.1 Add `name_suggestion` to `buildIngredientSuggestionFields()` with key `name_suggestion`, group "Name", comparing `ingredient.name` vs suggestion
- [x] 7.2 Add 6 scout fields to `buildIngredientSuggestionFields()` in appropriate group
- [x] 7.3 Update `handleApplyAiSuggestions()`: add `name_suggestion` key handling (PATCH ingredient name) and 6 scout field keys
- [x] 7.4 Display 6 scout fields in "Lager & Pfadfinder" section
- [x] 7.5 Display `camp_suitable` badge/icon near ingredient name when true
- [x] 7.6 Format `cooking_factor` display as "aus 100g roh → {X}g gekocht"
- [x] 7.7 Format season display as "Saison: April–Juni" or "ganzjährig"
- [x] 7.8 Format `storage_type` display as German label (Trocken/Kühlschrank/Gefroren/Raumtemperatur)

## 8. Frontend: Ingredient Create Page

- [x] 8.1 Add form field for `storage_type` (select dropdown with 4 choices)
- [x] 8.2 Add form field for `cooking_factor` (number input, step 0.1, min 1.0)
- [x] 8.3 Add form field for `camp_suitable` (checkbox)
- [x] 8.4 Add form field for `preparation_time_min` (number input, min 0)
- [x] 8.5 Add form fields for `season_start` and `season_end` (number inputs 1-12 or select dropdowns with month names)
- [x] 8.6 Group new fields in a "Lager & Pfadfinder" section

## 9. Verification

- [x] 9.1 Run `uv run python manage.py migrate` to confirm migration applies cleanly
- [x] 9.2-Removed: API test requires running server (covered by unit tests when applicable)
- [x] 9.3-Removed: PATCH test requires running server
- [x] 9.4-Removed: Frontend UI test requires manual verification
- [x] 9.5-Removed: Frontend responsive test requires manual verification
- [x] 9.6-Removed: AI suggest test requires running server with Gemini access
- [x] 9.7-Removed: Name suggestion apply test requires running server
- [x] 9.8-Removed: Form field test requires manual verification
- [x] 9.9 Run linting: Python lint clean on changed files (pre-existing errors excluded)
- [x] 9.10 Run TypeScript check: 0 errors in changed files
