## 1. Backend: Rule Model & Migration

- [x] 1.1 Create `Rule` model in `backend/recipe/models/` with all fields (name, description, parameter, scope, rule_type, min_yellow, min_green, max_green, max_yellow, unit, hint_level, tip_text, improvement_text, is_active, sort_order). Register in `__init__.py`.
- [x] 1.2 Write data migration: migrate all HealthRule entries to Rule (rule_type="nutrition"), migrate all RecipeHint entries to Rule (scope="recipe", map value+min_max to range fields).
- [x] 1.3 Remove HealthRule and RecipeHint models. Update `__init__.py` exports.
- [x] 1.4 Add `budget_per_person_per_day` (DecimalField, nullable) to MealPlan model in `backend/planner/models/meal_plan.py`. Run makemigrations.

## 2. Backend: Pydantic Schemas

- [x] 2.1 Create `RuleOut`, `RuleIn`, `RuleUpdateIn` schemas replacing HealthRuleOut/In and RecipeHintOut. Update `backend/recipe/schemas/`.
- [x] 2.2 Create `SuggestionOut`, `RecipeSuggestionOut`, `SuggestionDashboardOut` schemas in `backend/recipe/schemas/suggestions.py`.
- [x] 2.3 Update `MealPlanOut`, `MealPlanIn`, `MealPlanUpdateIn` to include `budget_per_person_per_day` in `backend/planner/schemas/meal_plan.py`.

## 3. Backend: Suggestion Service

- [x] 3.1 Create `backend/recipe/services/suggestion_service.py` with `evaluate_suggestions(meal_plan) → SuggestionDashboardOut`.
- [x] 3.2 Implement `_check_completeness()`: iterate all Meals, check for MealItems, generate red suggestions for empty meals with recipe suggestions (top 3 by like_score matching meal_type).
- [x] 3.3 Implement `_check_duplicates()`: find recipes used more than once, generate yellow suggestions.
- [x] 3.4 Implement `_evaluate_admin_rules()`: reuse aggregation logic from cockpit_service.py, evaluate all active Rules against aggregated values per scope.
- [x] 3.5 Implement `_check_budget()`: compare MealPlan.budget_per_person_per_day against actual cost_per_person_per_day (reuse cost calculation from planner cost endpoint). Green if ≤ budget, yellow if ≤ budget×1.2, red if > budget×1.2. Identify most expensive recipe for tip. Skip if no budget set.
- [x] 3.6 Implement suggestion sorting: by status (red > yellow > green), then by priority (completeness=1, budget=2, nutrition=3, duplicate=4).
- [x] 3.7 Add budget price coverage calculation: count ingredients with/without price_per_kg, include coverage percentage in budget suggestions.

## 4. Backend: API Endpoints

- [x] 4.1 Create `backend/recipe/api/rules.py` with public list endpoint `GET /api/rules/` and staff CRUD endpoints `POST/PUT/DELETE /api/rules/admin/`.
- [x] 4.2 Create suggestion endpoint `GET /api/meal-plans/{id}/suggestions/` in `backend/planner/api/meal_plan.py` (or new file). Check owner/collaborator permissions.
- [x] 4.3 Remove old cockpit endpoints (`/api/health-rules/`, `/api/meal-plans/{id}/cockpit/`, `/api/meal-plans/{id}/days/{date}/cockpit/`, `/api/meals/{id}/cockpit/`) and old recipe-hint endpoints (`/api/recipe-hints/`).
- [x] 4.4 Update router registrations in `backend/recipe/api/__init__.py` and `backend/planner/api/__init__.py`.

## 5. Backend: Seed Rules

- [x] 5.1 Create management command `backend/recipe/management/commands/seed_rules.py`. Idempotent via get_or_create by name.
- [x] 5.2 Add day-scope seed rules: energy_kj (8000-11000kJ green), protein_g (45-80g green), fat_g (60-95g green), carbohydrate_g (250-350g green), fibre_g (25g+ min-only), sugar_g (max 60g), fat_sat_g (max 25g), sodium_mg (max 2000mg). All with German tip_text.
- [x] 5.3 Add meal-scope seed rules: energy_kj (2000-4000kJ green), sugar_g (max 20g).
- [x] 5.4 Add recipe-scope seed rules: protein_g (30g+ min-only), sugar_g (max 20g), fat_sat_g (max 20g), sodium_mg (max 500mg), fibre_g (30g+ min-only).
- [x] 5.5 Add event-scope seed rules: energy_kj (8500-11000kJ/Tag green), protein_g (45-80g/Tag green).
- [x] 5.6 Remove old `seed_recipe_hints.py` command.

## 6. Backend: Update recipe_checks.py

- [x] 6.1 Update `match_recipe_hints()` in `backend/recipe/services/recipe_checks.py` to use Rule model (scope="recipe") instead of RecipeHint. Function can be renamed to `match_recipe_rules()`.
- [x] 6.2 Update `backend/recipe/services/improvement_ranking_service.py` to use Rule instead of RecipeHint.

## 7. Frontend: Zod Schemas

- [x] 7.1 Create `frontend-food/src/schemas/suggestions.ts` with RuleSchema, SuggestionSchema, RecipeSuggestionSchema, SuggestionDashboardSchema.
- [x] 7.2 Remove cockpit.ts schemas (HealthRuleSchema, CockpitEvaluationSchema, CockpitDashboardSchema).
- [x] 7.3 Remove RecipeHintSchema from `frontend-food/src/schemas/recipe.ts` and `frontend-food/src/schemas/supply.ts`.
- [x] 7.4 Update MealPlanSchema to include `budget_per_person_per_day` in `frontend-food/src/schemas/`.

## 8. Frontend: API Hooks

- [x] 8.1 Create `frontend-food/src/api/suggestions.ts` with `useMealPlanSuggestions(mealPlanId)` TanStack Query hook (staleTime: 30s).
- [x] 8.2 Create `useRules()` hook for public rule list.
- [x] 8.3 Update `frontend-food/src/api/admin.ts`: replace `useAdminHealthRules` + `useAdminRecipeHints` with `useAdminRules`, `useCreateRule`, `useUpdateRule`, `useDeleteRule`. Add `useToggleRuleActive` for quick-toggle.
- [x] 8.4 Remove `frontend-food/src/api/cockpit.ts`.

## 9. Frontend: Vorschläge Tab Components

- [x] 9.1 Create `frontend-food/src/components/suggestions/SuggestionCard.tsx`: displays one suggestion with Ampel dot, message, tip, and optional recipe suggestions with "Übernehmen" and "Mehr suchen" buttons.
- [x] 9.2 Create `frontend-food/src/components/suggestions/SuggestionDashboard.tsx`: renders list of SuggestionCards sorted by priority, shows "Alles gut!" state when all green. Includes budget coverage note.
- [x] 9.3 Create `frontend-food/src/components/suggestions/SuggestionBadge.tsx`: badge component showing worst color + count for the tab.
- [x] 9.4 Reuse `TrafficLightIndicator.tsx` from cockpit components (keep or move to shared).

## 10. Frontend: MealPlan Page Integration

- [x] 10.1 Update `frontend-food/src/pages/planning/MealEventDetailPage.tsx`: replace Cockpit tab with "Vorschläge" tab, use SuggestionBadge on tab label, render SuggestionDashboard in tab content.
- [x] 10.2 Remove CockpitView, DayCockpitDots, MealCockpitDots from MealEventDetailPage.
- [x] 10.3 Add budget_per_person_per_day input to MealPlan settings (Einstellungen dialog/sheet).

## 11. Frontend: Admin "Regeln" Tab

- [x] 11.1 Create `frontend-food/src/components/admin/AmpelRangePreview.tsx`: visual traffic-light range bar component. Shows red/yellow/green/yellow/red zones. Accepts min_yellow, min_green, max_green, max_yellow as props. Supports min-only and max-only modes (nullable fields). Updates live when props change.
- [x] 11.2 Create `frontend-food/src/pages/admin/RuleTab.tsx`: unified CRUD table for Rules grouped by scope (collapsible sections). Table shows: colored scope badges, compact inline ampel bar per row, parameter with German label, quick-toggle for is_active.
- [x] 11.3 Create rule create/edit dialog with: parameter dropdown (German labels like "Eiweiß (g)", "Zucker (g)"), scope dropdown with icons, 4 threshold number inputs with live AmpelRangePreview, tip_text textarea, improvement_text textarea, is_active checkbox.
- [x] 11.4 Update `frontend-food/src/pages/admin/AdminPage.tsx`: replace "Gesundheitsregeln" and "Rezept-Hinweise" tabs with single "Regeln" tab.
- [x] 11.5 Remove `HealthRuleTab.tsx` and `RecipeHintTab.tsx`.

## 12. Frontend: Recipe Detail Page

- [x] 12.1 Update `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` and `RecipeImprovements.tsx` to use Rule-based matching instead of RecipeHint.
- [x] 12.2 Update `frontend-food/src/components/recipe/HintDetailModal.tsx` to work with Rule model.

## 13. Cleanup

- [x] 13.1 Remove old cockpit components: `frontend-food/src/components/cockpit/CockpitDashboard.tsx`, `CockpitSummaryCard.tsx`, `HealthTipCard.tsx`, `index.ts`. Keep TrafficLightIndicator if reused.
- [x] 13.2 Remove `backend/recipe/services/cockpit_service.py` (logic merged into suggestion_service).
- [x] 13.3 Remove `backend/recipe/api/cockpit.py` and `backend/recipe/api/hints.py`.
