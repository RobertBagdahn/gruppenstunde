## 1. Backend: Pydantic Schemas

- [x] 1.1 Create `backend/supply/schemas/ingredient_statistics.py` with all Pydantic schemas:
  - `RankingItem`, `RankingsData` — for leaderboard endpoints
  - `HistogramBucket`, `DistributionData` — for histogram endpoints
  - `ScatterPoint`, `ScatterData` — for scatter/correlation endpoints
  - `TagListItem`, `TagListData` — for tag-based list endpoints
  - `NutriClassCount`, `ScoreData` — for score distribution endpoints
  - `OutlierItem`, `OutlierData` — for outlier detection endpoint
  - `ComparisonGroup`, `ComparisonData` — for group comparison endpoint
- [x] 1.2 Export new schemas from `backend/supply/schemas/__init__.py`

## 2. Backend: API Endpoints (7 Endpoints)

- [x] 2.1 Create `backend/supply/api/ingredient_statistics.py` with `ingredient_statistics_router`
- [x] 2.2 Implement `GET /rankings/` — accepts `field`, `retail_section_id`, `tag`. Returns Top-20 and Bottom-20 for the given field. Filters to verified only. Excludes zero/null values from bottom ranking.
- [x] 2.3 Implement `GET /distributions/` — accepts `field`, `retail_section_id`, `tag`. Returns 20-bucket histogram with mean, median, P5, P95 stats.
- [x] 2.4 Implement `GET /scatter/` — accepts `x_field`, `y_field`, `color_by`, `retail_section_id`. Returns scatter points with optional Pearson r.
- [x] 2.5 Implement `GET /tag-lists/` — accepts `tag` (tag name), `sort_by`, `retail_section_id`. Returns all matching ingredients with key fields and total_count context.
- [x] 2.6 Implement `GET /scores/` — accepts `score_type`, `retail_section_id`. Returns counts per class plus top-3/bottom-3 per class.
- [x] 2.7 Implement `GET /outliers/` — accepts `field` (optional), `retail_section_id`. Returns IQR outliers (moderate >1.5×IQR, extreme >3×IQR) for specified or all nutrient fields.
- [x] 2.8 Implement `GET /comparison/` — accepts `group_by` (tag name), `metric`, `retail_section_id`. Returns distribution data for group vs. rest with mean difference.

### Shared Backend Utilities

- [x] 2.9 Implement `_base_queryset(filters)` — build base QuerySet with `.values()` for all numeric fields, filter by status='verified', optional retail_section_id and nutritional tag.
- [x] 2.10 Implement `_compute_iqr_outliers(values)` — reusable IQR function returning moderate and extreme outliers.
- [x] 2.11 Implement `_compute_histogram(values, buckets=20)` — reusable histogram bucketizer.
- [x] 2.12 Implement `_compute_pearson_r(x_values, y_values)` — Pearson correlation coefficient.

## 3. Backend: Router Registration

- [x] 3.1 Register `ingredient_statistics_router` in `backend/supply/api/__init__.py`
- [x] 3.2 Add route in `backend/inspi/urls.py` under `/api/ingredients/statistics/`

## 4. Frontend: Zod Schemas

- [x] 4.1 Add Zod schemas in `frontend-food/src/schemas/supply.ts` matching all Pydantic schemas 1:1:
  - `IngredientRankingsSchema`, `RankingsFiltersSchema`
  - `IngredientDistributionsSchema`, `DistributionFiltersSchema`
  - `IngredientScatterSchema`, `ScatterFiltersSchema`
  - `IngredientTagListSchema`, `TagListFiltersSchema`
  - `IngredientScoresSchema`, `ScoresFiltersSchema`
  - `IngredientOutliersSchema`, `OutlierFiltersSchema`
  - `IngredientComparisonSchema`, `ComparisonFiltersSchema`
- [x] 4.2 Export TypeScript types for all schemas

## 5. Frontend: API Hooks (7 Hooks)

- [x] 5.1 Add `useIngredientRankings(filters)` in `frontend-food/src/api/supplies.ts`
- [x] 5.2 Add `useIngredientDistributions(filters)`
- [x] 5.3 Add `useIngredientScatter(filters)`
- [x] 5.4 Add `useIngredientTagLists(filters)`
- [x] 5.5 Add `useIngredientScores(filters)`
- [x] 5.6 Add `useIngredientOutliers(filters)`
- [x] 5.7 Add `useIngredientComparison(filters)`
- [x] 5.8 All hooks: `staleTime: 5 * 60 * 1000`, Zod validation, CSRF headers, query key pattern `['ingredient-<type>', filters]`

## 6. Frontend: Routing & Navigation

- [x] 6.1 Add `<Route path="ingredients/statistics/:tab?" element={<IngredientStatisticsPage />} />` in `frontend-food/src/App.tsx` under the FoodLayout wrapper
- [x] 6.2 Add "Statistiken" button with `bar_chart_4_bars` icon to `IngredientListPage` header toolbar (top right, next to sort/filter controls), linking to `/ingredients/statistics`

## 7. Frontend: Page Shell (IngredientStatisticsPage)

- [x] 7.1 Create `frontend-food/src/pages/ingredients/statistics/IngredientStatisticsPage.tsx`
- [x] 7.2 Parse `:tab` from `useParams`, redirect to `sugar-extremes` if missing or invalid
- [x] 7.3 Render horizontal tab bar using shadcn/ui Tabs with `overflow-x-auto` and fade indicator on mobile
- [x] 7.4 Tab configuration array with 20 entries: `{ id, label, category, component }`
- [x] 7.5 On tab click: navigate to `/ingredients/statistics/:newTab` via React Router
- [x] 7.6 Render the active tab component below the tab bar

## 8. Frontend: Shared Components

- [x] 8.1 Create `frontend-food/src/pages/ingredients/statistics/components/LeaderboardTable.tsx` — reusable Top-20/Bottom-20 table with toggle, horizontal bar chart (Recharts BarChart), linked ingredient names
- [x] 8.2 Create `frontend-food/src/pages/ingredients/statistics/components/DistributionChart.tsx` — reusable histogram with Mean/Median/P5/P95 reference lines (Recharts BarChart + ReferenceLine), summary box below
- [x] 8.3 Create `frontend-food/src/pages/ingredients/statistics/components/ScatterExplorer.tsx` — reusable scatter plot with optional axis selectors, Nutri-Score coloring, linked points (Recharts ScatterChart)
- [x] 8.4 Create `frontend-food/src/pages/ingredients/statistics/components/OutlierAccordion.tsx` — collapsible sections per nutrient, color-coded table rows (yellow=moderate, red=extreme), linked names
- [x] 8.5 Create `frontend-food/src/pages/ingredients/statistics/components/TabFilters.tsx` — reusable filter bar accepting filter config, synced to URL search params

## 9. Frontend: Leaderboard Tabs (1–5)

- [x] 9.1 Create `SugarExtremesTab.tsx` — field=`sugar_g`, uses `useIngredientRankings`
- [x] 9.2 Create `ProteinChampionsTab.tsx` — field=`protein_g`, badges for vegan/vegetarian/meat
- [x] 9.3 Create `EnergyDensityTab.tsx` — field=`energy_kcal`, indicator for fat/sugar dominance
- [x] 9.4 Create `ProteinPerEuroTab.tsx` — computed ranking (protein_g/price_per_kg), color by diet type
- [x] 9.5 Create `NutrientHallOfFame.tsx` — card grid for fibre, salt, vitamin_c leaders/laggards

## 10. Frontend: Distribution Tabs (6–10)

- [x] 10.1 Create `SugarDistributionTab.tsx` — field=`sugar_g`, outlier highlighting, summary box
- [x] 10.2 Create `ProteinLandscapeTab.tsx` — field=`protein_g`, toggle "Alle / Nur pflanzlich"
- [x] 10.3 Create `FatCompositionTab.tsx` — side-by-side histograms for fat_g and fat_sat_g
- [x] 10.4 Create `PriceBySectionTab.tsx` — stacked histogram, color by retail section
- [x] 10.5 Create `FibreDesertTab.tsx` — field=`fibre_g`, green/gray split at median

## 11. Frontend: Correlation Tabs (11–14)

- [x] 11.1 Create `SugarVsFatTab.tsx` — x=`sugar_g`, y=`fat_g`, point size by energy_kcal, color by nutri_class
- [x] 11.2 Create `EnvironmentVsPriceTab.tsx` — x=`environmental_score`, y=`price_per_kg`, trendline
- [x] 11.3 Create `ProteinVsEnergyTab.tsx` — x=`protein_g`, y=`energy_kcal`, "Holy Grail" zone highlight
- [x] 11.4 Create `ChildVsNutriTab.tsx` — x=`child_score`, y=`nutri_class`, sweet spot highlight

## 12. Frontend: Tag List Tabs (15–17)

- [x] 12.1 Create `GlutenRadarTab.tsx` — tag=`gluten`, sortable table, count badge "X von Y"
- [x] 12.2 Create `VeganProteinTab.tsx` — tag=`vegan`, sorted by protein descending, top-5 green badge
- [x] 12.3 Create `LactoseOverviewTab.tsx` — tag=`lactose`, sortable table with lactose_g column

## 13. Frontend: Score Tabs (18–19)

- [x] 13.1 Create `NutriLandscapeTab.tsx` — pie chart A–E, mini tables per class, Nutri-Score colors
- [x] 13.2 Create `NovaProcessingTab.tsx` — bar chart NOVA 1–4, cross-table NOVA×Nutri-Score, low-data warning

## 14. Frontend: Outlier Tab (20)

- [x] 14.1 Create `OutlierDetectorTab.tsx` — summary count line, accordion per field, color-coded table

## 15. Frontend: Tab-Specific Filters

- [x] 15.1 Implement retail section filter for leaderboard, distribution, scatter, tag-list tabs
- [x] 15.2 Implement nutritional tag filter for leaderboard and distribution tabs
- [x] 15.3 Implement "Alle / Nur pflanzlich" toggle for ProteinLandscapeTab
- [x] 15.4 Sync all tab filters to URL search params (comma-separated for multi-value)

## 16. Verification & Polish

- [x] 16.1 Run `uv run python manage.py test supply` and verify all backend tests pass
- [x] 16.2 Run frontend typecheck: `npx tsc --noEmit` in `frontend-food/` — only pre-existing errors remain, none from new code
- [x] 16.3 Run frontend lint: `npm run lint` in `frontend-food/` — only pre-existing errors remain, none from new code
- [x] 16.4 Manual test: navigate `/ingredients/statistics`, click through all 20 tabs, verify data loads, verify URL changes
- [x] 16.5 Manual test: apply tab-specific filters, verify URL sync, verify data updates
- [x] 16.6 Manual test: click ingredient links from rankings/outliers, verify they navigate to correct detail pages
- [x] 16.7 Manual test: test on mobile viewport (320px), verify horizontal tab scroll and fade indicator
- [x] 16.8 Verify API response time <200ms for each endpoint with `curl -w "@curl-format.txt"`
- [x] 16.9 Verify cache invalidation: after editing an ingredient, statistics data refreshes
