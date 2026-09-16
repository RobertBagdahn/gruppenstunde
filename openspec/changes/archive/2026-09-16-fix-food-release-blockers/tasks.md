## 1. Replacement-Flow Backend

- [x] 1.1 Change `backend/recipe/api/items.py` so replacement candidates with `replacement_for_item_id` bypass only the normal duplicate filter while ordinary duplicate candidates remain filtered.
- [x] 1.2 Add backend integration coverage for `Salz -> Jodsalz` proving the suggestion response contains the replacement candidate and no add candidate for the same ingredient.
- [x] 1.3 Verify replacement endpoint authorization, target-portion validation, item-ID preservation, variant-group preservation, idempotency conflict handling, and recipe-cache recalculation remain covered.

## 2. Price Approval Consolidation

- [x] 2.1 Refactor `backend/content/api/data_quality.py` price evaluation to create or reuse pending `IngredientPriceProposal` records through the shared proposal service instead of producing an independent unpersisted AI price path.
- [x] 2.2 Replace or adapt `PATCH /api/admin/data-quality/ingredients/price-analysis/apply/` so it cannot directly write unconfirmed AI prices and returns per-item proposal/approval outcomes with conflict handling.
- [x] 2.3 Keep positive-price protection, explicit replacement behavior, reviewer provenance, proposal idempotency, and dependent recipe-cache invalidation consistent with `supply/services/ingredient_price_proposal_service.py`.
- [x] 2.4 Update `backend/content/schemas/data_quality.py` and related exports for the batch proposal/approval response contract.
- [x] 2.5 Add backend tests for missing/zero prices, pending reuse, rejection, positive-price conflict, explicit replacement, unauthorized access, partial batch failure, and cache invalidation.

## 3. Meal-Plan Price Coverage

- [x] 3.1 Extend `MealPlanCostSummaryOut` in `backend/planner/schemas/meal_plan.py` with `missing_ingredients` and `coverage` using the shared `PriceCoverageOut` contract or an equivalent synchronized schema.
- [x] 3.2 Update `backend/planner/api/meal_plan.py` to count active recipe ingredients and direct ingredients exactly once, treat pending proposals as missing, and return partial known totals with coverage metadata.
- [x] 3.3 Add backend tests for complete, partial, absent, pending-proposal, variant-selected, and direct-ingredient cost coverage.
- [x] 3.4 Add cross-consumer assertions that recipe detail, meal-plan costs, cooking schedule, and shopping calculations agree on confirmed versus missing prices.

## 4. Food Frontend Contracts And UX

- [x] 4.1 Update `frontend-food/src/schemas/dataQuality.ts` and `frontend-food/src/schemas/mealPlan.ts` to match the new backend response fields and proposal statuses.
- [x] 4.2 Update `frontend-food/src/api/dataQuality.ts` and related TanStack Query invalidations for proposal creation, approval, rejection, and batch outcomes.
- [x] 4.3 Update `frontend-food/src/components/data-quality/PriceAnalysisTable.tsx` to show pending proposals and route or apply them only through the approval workflow.
- [x] 4.4 Update `frontend-food/src/pages/planning/CostDashboard.tsx` and related meal-card views to show `missing_ingredients` and `coverage` consistently for partial costs.
- [x] 4.5 Add Food frontend tests for replacement response partitioning, price proposal batch outcomes, approval errors, partial cost warnings, and contract parsing.

## 5. Verification And Release Gate

- [x] 5.1 Run `uv run python manage.py makemigrations --check` and create a migration only if the final contract requires new persisted fields.
- [x] 5.2 Run targeted backend tests for recipe, supply, content, planner, shopping, and cross-consumer consistency.
- [x] 5.3 Run `uv run pytest` for the complete backend suite and record any unrelated baseline failures separately.
- [x] 5.4 Run Food frontend typecheck, lint, targeted Vitest tests, and the complete Food frontend test suite.
- [x] 5.5 Validate this change with `openspec validate --change "fix-food-release-blockers"` and perform a release diff review that excludes the unfinished Piece-Portion change from the deployment scope.
