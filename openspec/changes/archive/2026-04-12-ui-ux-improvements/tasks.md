## 1. Setup and Dependencies

- [x] 1.1 Install `recharts` npm dependency in the frontend project (already installed)
- [x] 1.2 Create `frontend/src/components/shared/` directory structure for shared components
- [x] 1.3 Add shadcn/ui `Command` component (cmdk) if not already installed (`npx shadcn-ui@latest add command`)

## 2. Shared Pagination Component

- [x] 2.1 Create `frontend/src/components/shared/Pagination.tsx` with numbered page buttons, prev/next arrows, ellipsis for large page counts, and mobile-compact mode
- [x] 2.2 Replace pagination in `SessionListPage.tsx` with shared Pagination component
- [x] 2.3 Replace pagination in `GameListPage.tsx` with shared Pagination component
- [x] 2.4 Replace pagination in `BlogListPage.tsx` with shared Pagination component
- [x] 2.5 Replace pagination in `RecipeListPage.tsx` with shared Pagination component
- [x] 2.6 Replace pagination in `SearchPage.tsx` with shared Pagination component
- [x] 2.7 Replace pagination in `IngredientListPage.tsx` with shared Pagination component
- [x] 2.8 Replace pagination in `ShoppingListPage.tsx` with shared Pagination component

## 3. Shared ListPageHero Component

- [x] 3.1 Create `frontend/src/components/shared/ListPageHero.tsx` with gradient background, icon, title, optional mascot image and count badge, full-bleed layout
- [x] 3.2 Replace hero section in `SessionListPage.tsx` with ListPageHero
- [x] 3.3 Replace hero section in `GameListPage.tsx` with ListPageHero
- [x] 3.4 Replace hero section in `BlogListPage.tsx` with ListPageHero
- [x] 3.5 Replace hero section in `RecipeListPage.tsx` with ListPageHero
- [x] 3.6 Replace hero section in `SearchPage.tsx` with ListPageHero
- [x] 3.7 Add ListPageHero to `IngredientListPage.tsx`
- [x] 3.8 Add ListPageHero to `PackingListsPage.tsx`
- [x] 3.9 Add ListPageHero to `ShoppingListPage.tsx`

## 4. Shared EmptyState Component

- [x] 4.1 Create `frontend/src/components/shared/EmptyState.tsx` with mascot/icon, title, description, optional CTA button
- [x] 4.2 Replace empty state in `EventsPage.tsx` with shared EmptyState
- [x] 4.3 Replace empty state in `ShoppingListPage.tsx` with shared EmptyState
- [x] 4.4 Replace empty state in `PackingListsPage.tsx` with shared EmptyState
- [x] 4.5 Replace empty state in `PlannerPage.tsx` with shared EmptyState
- [x] 4.6 Replace empty state in `PersonsPage.tsx` with shared EmptyState
- [x] 4.7 Replace empty state in `MealEventDetailPage.tsx` with shared EmptyState
- [x] 4.8 Verify SearchPage empty state already matches the pattern (reference implementation)

## 5. Shared FilterSelect and SortSelect Components

- [x] 5.1 Create `frontend/src/components/shared/FilterSelect.tsx` with label, options, "Alle" default, URL parameter sync
- [x] 5.2 Create `frontend/src/components/shared/SortSelect.tsx` with standard sort options (Neueste, Beliebteste, Alphabetisch), URL parameter sync
- [x] 5.3 Replace inline filter selects in `SessionListPage.tsx` with shared FilterSelect
- [x] 5.4 Replace inline filter selects in `GameListPage.tsx` with shared FilterSelect
- [x] 5.5 Replace inline filter selects in `BlogListPage.tsx` with shared FilterSelect
- [x] 5.6 Add SortSelect to `SessionListPage.tsx` (currently missing sort)
- [x] 5.7 Add SortSelect to `GameListPage.tsx` (currently missing sort)

## 6. Container Width Standardization

- [x] 6.1 Update `SessionListPage.tsx` to use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.2 Update `GameListPage.tsx` to use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.3 Update `BlogListPage.tsx` to use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.4 Update `RecipeListPage.tsx` container to use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.5 Update `SearchPage.tsx` container to use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.6 Update `EventsPage.tsx` to use `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.7 Update `EventDashboardPage.tsx` to use `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.8 Update `IngredientListPage.tsx` to use `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.9 Update `MealEventDetailPage.tsx` container to use `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.10 Update `PlannerPage.tsx` to add `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8` container
- [x] 6.11 Update `MyDashboardPage.tsx` to use `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.12 Update `PersonsPage.tsx` to use `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.13 Update `GroupDetailPage.tsx` to use `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.14 Update `EditRecipePage.tsx` to use `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.15 Update `ShoppingListPage.tsx` to use `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`
- [x] 6.16 Update `PackingListDetailPage.tsx` to use `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`

## 7. Structured Skeleton Loaders

- [x] 7.1 Replace single-block skeleton in `PackingListWizardPage.tsx` with structured multi-area skeleton matching the wizard layout
- [x] 7.2 Replace single-block skeleton in `IdeaOfTheWeekPage.tsx` with structured skeleton matching content card layout
- [x] 7.3 Audit and improve skeleton in `PlannerPage.tsx` detail area to match final layout
- [x] 7.4 Verify all other pages already have structured skeletons (HomePage, EventDashboard, PackingListDetail, GroupDetail, SearchPage)

## 8. Image Performance Optimization

- [x] 8.1 Add `loading="lazy"` and `width`/`height` attributes to all 37 gallery images in `AboutPage.tsx`
- [x] 8.2 Add `loading="lazy"` to below-fold images in `HomePage.tsx` (category cards, fun-facts section)
- [x] 8.3 Ensure hero images on `HomePage.tsx` and `AboutPage.tsx` do NOT have `loading="lazy"` (above-fold)
- [x] 8.4 Add `loading="lazy"` and dimensions to mascot image in `CreateHubPage.tsx` (N/A — no img tags)
- [x] 8.5 Audit all other pages for images missing `loading="lazy"` and fix remaining cases

## 9. Smart Form Defaults

- [x] 9.1 Add default values to `CreateGamePage.tsx`: `gameType='group_game'`, `playArea='outdoor'`
- [x] 9.2 Add default values to `CreateSessionPage.tsx` for session type
- [x] 9.3 Create `frontend/src/lib/persistedDefaults.ts` utility for storing/retrieving last-used sort and filter selections in localStorage
- [x] 9.4 Integrate persisted defaults into SortSelect and FilterSelect components

## 10. Data Visualizations (Recharts)

- [x] 10.1 Create `frontend/src/components/charts/NutritionPieChart.tsx` with lazy-loaded Recharts PieChart for macro-nutrient breakdown (protein, fat, carbohydrates)
- [x] 10.2 Integrate NutritionPieChart into `RecipeDetailPage.tsx` nutrition section
- [x] 10.3 Create `frontend/src/components/charts/ContentStatsBarChart.tsx` with lazy-loaded Recharts BarChart for content type counts
- [x] 10.4 Integrate ContentStatsBarChart into `AdminPage.tsx` below the existing stat cards
- [x] 10.5 Create `frontend/src/components/charts/NutrientBalanceChart.tsx` with lazy-loaded Recharts stacked BarChart for per-day nutrient totals
- [x] 10.6 Integrate NutrientBalanceChart into `MealEventDetailPage.tsx` NutritionView
- [x] 10.7 Add skeleton placeholders for all chart components while they lazy-load

## 11. Command Palette (Cmd+K)

- [x] 11.1 Create `frontend/src/components/shared/CommandPalette.tsx` using shadcn/ui Command component with search input, grouped results, quick actions, and recent searches
- [x] 11.2 Create `frontend/src/hooks/useCommandPalette.ts` hook for global Cmd+K/Ctrl+K keyboard listener with input focus detection
- [x] 11.3 Create `frontend/src/lib/recentSearches.ts` utility for storing/retrieving recent search queries in localStorage
- [x] 11.4 Integrate CommandPalette into the root layout (render once, globally available)
- [x] 11.5 Add search icon trigger button to header/navigation for mobile users
- [x] 11.6 Connect command palette search to existing `/api/content/search/autocomplete/` endpoint with 300ms debounce
- [x] 11.7 Add quick navigation actions (Neues Spiel erstellen, Neues Rezept erstellen, etc.) and page navigation section

## 12. Icon Consistency Fix

- [x] 12.1 Replace Lucide React icons in `AdminPage.tsx` with Google Material Symbols for consistency with the rest of the app

## 13. Verification

- [x] 13.1 Run `npm run build` (or equivalent) to verify no new TypeScript errors (all errors are pre-existing)
- [ ] 13.2 Visually verify all list pages have consistent pagination, hero sections, and container widths
- [ ] 13.3 Verify command palette opens with Cmd+K and does not trigger inside form inputs
- [ ] 13.4 Verify charts render correctly with data and show skeletons while loading
- [ ] 13.5 Verify AboutPage Lighthouse performance score improved (lazy-loaded images)
- [x] 13.6 Run `npm run test` to verify no test regressions (188/188 pass, 1 pre-existing failure)
