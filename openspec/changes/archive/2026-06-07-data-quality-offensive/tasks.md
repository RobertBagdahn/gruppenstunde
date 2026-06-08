## 1. Infrastructure — pgvector & Dependencies

- [x] 1.1 Add `pgvector` to backend/pyproject.toml and run `uv lock`
- [x] 1.2 Create database migration to enable `vector` extension (`CREATE EXTENSION IF NOT EXISTS vector`)
- [x] 1.3 Create migration: Content.embedding BinaryField → VectorField(768) with data migration (struct.unpack existing data)
- [x] 1.4 Update OpenTofu config in `terraform/` to enable pgvector extension on Cloud SQL

## 2. Backend — Ingredient Model Changes

- [x] 2.1 Add fields to Ingredient model: `embedding` (VectorField(768)), `embedding_updated_at`, `search_vector`, `quality_score`, `quality_score_updated_at`
- [x] 2.2 Add fields to Recipe model: `quality_score`, `quality_score_updated_at`
- [x] 2.3 Create and run Django migrations for both models
- [x] 2.4 Update Ingredient Pydantic schemas (Create/Update/Detail) to include `quality_score`, `quality_score_updated_at`
- [x] 2.5 Update Recipe Pydantic schemas to include `quality_score`, `quality_score_updated_at`

## 3. Backend — Embedding Service for Ingredients

- [x] 3.1 Extend `content/services/embedding_service.py`: add `build_embedding_text(ingredient)` for Ingredient (name, description, nutritional_tags, retail_section)
- [x] 3.2 Add `update_ingredient_embedding(ingredient, force=False)` function with hash-based cache invalidation
- [x] 3.3 Add `find_similar_ingredients(ingredient, threshold=0.05, limit=20)` using pgvector `<=>` operator
- [x] 3.4 Create `post_save` signal handler for Ingredient to trigger async embedding update via `transaction.on_commit()`
- [x] 3.5 Update `generate_embeddings` management command to support `--type ingredient`
- [x] 3.6 Update `generate_embeddings` management command for pgvector storage format

## 4. Backend — Quality Score Service

- [x] 4.1 Create `supply/services/quality_score.py`: `calculate_ingredient_quality_score(ingredient)` with weighted categories (nutrition 40%, price 15%, physical 15%, classification 15%, scout 10%, portions 5%)
- [x] 4.2 Create `recipe/services/quality_score.py`: `calculate_recipe_quality_score(recipe)` with weighted categories (ingredients 30%, metadata 25%, cache 20%, nutrition 15%, price 10%)
- [x] 4.3 Connect quality score calculation to `post_save` signals for both Ingredient and Recipe
- [x] 4.4 Create management command `calculate_quality_scores` to backfill scores for all existing ingredients and recipes

## 5. Backend — ChangeAuditLog Model & Service

- [x] 5.1 Create `ChangeAuditLog` model in `content/models/` with fields: content_type (GFK), object_id, field_name, old_value, new_value, changed_by, changed_at
- [x] 5.2 Create migration for ChangeAuditLog table
- [x] 5.3 Create `pre_save` signal handler that compares old/new values and creates ChangeAuditLog entries for changed fields
- [x] 5.4 Connect signal handler to Ingredient and Recipe models
- [x] 5.5 Create audit log query utility functions
- [x] 5.6 Create management command `cleanup_audit_logs` (keeps 90 days by default)

## 6. Backend — Duplicate Detection API

- [x] 6.1 Add `GET /api/admin/data-quality/ingredients/duplicates/` endpoint (paginated, with threshold param)
- [x] 6.2 Add `GET /api/admin/data-quality/recipes/duplicates/` endpoint (paginated, with threshold param)
- [x] 6.3 Create `DuplicateDismissal` model to track dismissed false-positive pairs
- [x] 6.4 Add `POST /api/admin/data-quality/ingredients/duplicates/dismiss/` endpoint
- [x] 6.5 Add `DELETE /api/admin/data-quality/ingredients/duplicates/dismiss/` endpoint
- [x] 6.6 Add `GET /api/admin/data-quality/ingredients/merge/preview/` endpoint (returns affected recipe_items count, alias list, nutrition comparison)
- [x] 6.7 Add `POST /api/admin/data-quality/ingredients/merge/` endpoint (rebind recipe_items, create alias, soft-delete source)
- [x] 6.8 Add `POST /api/admin/data-quality/recipes/merge/` endpoint (soft-delete source, create ContentLink)
- [x] 6.9 Create Pydantic schemas for all duplicate/merge endpoints
- [x] 6.10 Register admin data-quality router in URL configuration

## 7. Backend — Price Analysis API

- [x] 7.1 Create `supply/services/price_analysis.py`: `get_price_anomalies(retail_section, z_threshold)` with Z-score calculation per retail section
- [x] 7.2 Add `GET /api/admin/data-quality/ingredients/price-analysis/` endpoint (paginated, filterable by anomaly_type)
- [x] 7.3 Add `POST /api/admin/data-quality/ingredients/price-analysis/evaluate/` endpoint (batch Gemini price suggestions with rate-limit handling)
- [x] 7.4 Add `PATCH /api/admin/data-quality/ingredients/price-analysis/apply/` endpoint (apply accepted prices)
- [x] 7.5 Create Pydantic schemas for price analysis request/response

## 8. Backend — Data Distribution Chart API

- [x] 8.1 Add `GET /api/data-quality/ingredients/distribution/cost/` endpoint (histogram buckets + stats, filterable by tags, retail_section, status)
- [x] 8.2 Add `GET /api/data-quality/ingredients/distribution/energy/` endpoint (histogram + top/bottom energy-dense)
- [x] 8.3 Add `GET /api/data-quality/ingredients/distribution/nutrients/` endpoint (macro stats, filterable)
- [x] 8.4 Add `GET /api/data-quality/recipes/distribution/cost/` endpoint
- [x] 8.5 Add `GET /api/data-quality/recipes/distribution/calories/` endpoint
- [x] 8.6 Add `GET /api/data-quality/recipes/distribution/nutri-score/` endpoint
- [x] 8.7 Create Pydantic schemas for all distribution endpoints

## 9. Backend — Data Quality Dashboard API

- [x] 9.1 Add `GET /api/admin/data-quality/ingredients/completeness/` endpoint (paginated ingredients sorted by quality_score with score breakdown)
- [x] 9.2 Add `GET /api/admin/data-quality/ingredients/missing-classification/` endpoint (ingredients without retail_section or nutritional_tags)
- [x] 9.3 Add `GET /api/admin/data-quality/ingredients/nutrition-plausibility/` endpoint (unusual macro sums, extreme energy density)
- [x] 9.4 Add `GET /api/admin/data-quality/recipes/metadata-check/` endpoint (recipes without image, tags, summary)
- [x] 9.5 Add `GET /api/admin/data-quality/recipes/cache-staleness/` endpoint (recipes with stale caches)
- [x] 9.6 Add `GET /api/admin/data-quality/recipes/portion-plausibility/` endpoint (unusual weight per portion)
- [x] 9.7 Add `GET /api/admin/data-quality/trend/` endpoint (daily average quality_score for last 30 days, filterable by type=ingredients|recipes)
- [x] 9.8 Create Pydantic schemas for all dashboard endpoints

## 10. Backend — Audit Log API

- [x] 10.1 Add `GET /api/admin/audit-log/` endpoint (paginated, filterable by content_type + object_id)
- [x] 10.2 Create Pydantic schemas for audit log response
- [x] 10.3 Wire audit log endpoint to admin router

## 11. Frontend — Zod Schemas

- [x] 11.1 Add data quality Zod schemas to `frontend-food/src/schemas/`: qualityScore, priceAnomaly, duplicatePair, mergePreview, distributionData, auditLogEntry
- [x] 11.2 Add Recipe quality_score and duplicate endpoint schemas to recipe schemas
- [x] 11.3 Add Ingredient quality_score and embedding schemas to supply schemas

## 12. Frontend — API Hooks (TanStack Query)

- [x] 12.1 Create `frontend-food/src/api/dataQuality.ts`: hooks for all data quality endpoints (useDuplicates, useMergePreview, useMerge, usePriceAnalysis, usePriceEvaluate, usePriceApply, useCompleteness, useMissingClassification, useNutritionPlausibility, useMetadataCheck, useCacheStaleness, usePortionPlausibility, useQualityTrend, useAuditLog)
- [x] 12.2 Add distribution chart hooks (useCostDistribution, useEnergyDistribution, useNutrientDistribution, useNutriScoreDistribution)
- [x] 12.3 Add impact analysis hook (useIngredientImpact)

## 13. Frontend — Quality Score Badge Component

- [x] 13.1 Create `QualityScoreBadge.tsx` shared component with ampel colors (green/yellow/red) and tooltip showing score breakdown
- [x] 13.2 Integrate QualityScoreBadge into IngredientDetailPage
- [x] 13.3 Integrate QualityScoreBadge into RecipeDetailPage
- [x] 13.4 Create `ImpactBadge.tsx` component showing "Wird in X Rezepten verwendet" with link
- [x] 13.5 Integrate ImpactBadge into IngredientDetailPage

## 14. Frontend — Audit Log Timeline

- [x] 14.1 Create `AuditLogTimeline.tsx` component (staff-only, shows last 20 changes with field, old/new values, user, timestamp)
- [x] 14.2 Integrate AuditLogTimeline into IngredientDetailPage (staff-only)
- [x] 14.3 Integrate AuditLogTimeline into RecipeDetailPage (staff-only)

## 15. Frontend — Data Quality Dashboard Pages

- [x] 15.1 Create `DataQualityPage.tsx` root layout with Ingredient/Recipe tab navigation at `/admin/data-quality`
- [x] 15.2 Create `DataQualityIngredientsPage.tsx` with sub-tabs: Preisanalyse, Duplikate, Vollständigkeit, Nährwert-Plausibilität, Fehlende Klassifikation
- [x] 15.3 Create `DataQualityRecipesPage.tsx` with sub-tabs: Duplikate, Metadaten-Check, Cache-Staleness, Portions-Plausibilität
- [x] 15.4 Add quality trend chart to overview tab using Recharts LineChart
- [x] 15.5 Wire StaffGuard to all data quality routes

## 16. Frontend — Price Analysis Components

- [x] 16.1 Create `PriceAnalysisTable.tsx` with checkbox selection, anomaly type badges, Z-score display
- [x] 16.2 Create "Mit KI bewerten" button flow: selected count badge → loading state → comparison table
- [x] 16.3 Create comparison table with columns: current price, AI suggestion, reasoning, "Übernehmen" button per row, "Alle übernehmen"
- [x] 16.4 Create filter controls: anomaly type (missing/high/low), retail_section

## 17. Frontend — Duplicate Detection Components

- [x] 17.1 Create `DuplicateDetectionList.tsx` showing pairs with similarity score and ingredient/recipe names
- [x] 17.2 Create threshold slider component (0.80–0.99 range)
- [x] 17.3 Create merge flow: preview dialog showing affected items → confirm → toast on success
- [x] 17.4 Create dismiss button to mark false-positive pairs

## 18. Frontend — Data Distribution Charts

- [x] 18.1 Create `DataDistributionsPage.tsx` (public, `/data-quality/distributions`) with Ingredient/Recipe tab navigation
- [x] 18.2 Create `CostDistributionChart.tsx` (histogram with Recharts BarChart)
- [x] 18.3 Create `EnergyDistributionChart.tsx` (histogram + top-N bar chart toggle)
- [x] 18.4 Create `NutrientScatterChart.tsx` (scatter plot: configurable X/Y axes, bubble size = energy, color = vegan/not)
- [x] 18.5 Create `NutriScoreDistributionChart.tsx` (bar/pie chart with official Nutri-Score colors)
- [x] 18.6 Create global filter bar: NutritionalTag (vegan/vegetarian), RetailSection (ingredients only), Status, RecipeType (recipes only)
- [x] 18.7 Add link from public navigation to `/data-quality/distributions`

## 19. Frontend — Completeness & Classification Components

- [x] 19.1 Create `CompletenessGrid.tsx` table with sortable columns: name, quality_score, score breakdown sub-columns
- [x] 19.2 Create `MissingClassificationList.tsx` with expandable sections for missing retail_section and missing nutritional_tags
- [x] 19.3 Create `NutritionPlausibilityList.tsx` with warning icons for unusual values
- [x] 19.4 Create `MetadataCheckList.tsx` for recipes missing image/tags/summary
- [x] 19.5 Create `CacheStalenessList.tsx` with "Cache neu berechnen" button per recipe
- [x] 19.6 Create `PortionPlausibilityList.tsx` with weight warnings

## 20. Frontend — Navigation & Routing

- [x] 20.1 Add Datenqualität navigation item to admin section, visible only for staff users
- [x] 20.2 Add routes in App.tsx: `/admin/data-quality`, `/admin/data-quality/ingredients`, `/admin/data-quality/recipes`
- [x] 20.3 Add public route `/data-quality/distributions` with navigation link (e.g., in footer or tools menu)

## 21. Backend — Management Commands & Finalization

- [x] 21.1 Run `generate_embeddings --type ingredient --force` for all existing ingredients
- [x] 21.2 Run `calculate_quality_scores` for all ingredients and recipes
- [x] 21.3 Verify pgvector IVFFlat indexes are created on embedding columns
- [x] 21.4 Test duplicate detection accuracy with known duplicate pairs
- [x] 21.5 Verify all API endpoints return correct pagination format
