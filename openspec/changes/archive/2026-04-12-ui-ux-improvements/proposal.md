## Why

The frontend has grown organically across many features, resulting in significant visual and UX inconsistencies: 5 different pagination styles, 7+ container widths, inconsistent hero sections, empty states, and loading skeletons. Pages feel slower than necessary due to missing lazy loading and unstructured skeleton loaders. There are zero data visualizations despite rich data (nutrition, admin stats, event trends). Fixing these issues in one pass will make the app feel polished, fast, and professional.

## What Changes

- **Shared Pagination component**: Extract a unified `<Pagination>` component (numbered buttons style) and replace all 5 existing pagination variants across SessionListPage, GameListPage, BlogListPage, RecipeListPage, SearchPage, IngredientListPage, ShoppingListPage
- **Standardized container widths**: Normalize all pages to three max-width tiers (`max-w-7xl` for grids, `max-w-5xl` for dashboards, `max-w-3xl` for forms/detail) with consistent `container mx-auto px-4` wrapping
- **Shared ListPageHero component**: Extract a unified hero section component with props for gradient color, icon, title, optional mascot and count badge; apply to all list pages
- **Structured skeleton loaders**: Replace single-block `animate-pulse` placeholders with layout-matching skeletons on PackingListWizardPage, IdeaOfTheWeekPage, and other pages with poor loading states
- **Charts and data visualizations**: Introduce Recharts for macro-nutrient pie chart (RecipeDetailPage), content growth bar chart (AdminPage), nutrient balance stacked bar (MealEventDetailPage NutritionView), and participant trend line (EventDashboardPage)
- **Smart form defaults**: Add sensible defaults to CreateGamePage (`gameType`, `playArea`, `minPlayers`, `maxPlayers`) and CreateSessionPage (session type); persist last-used filter selections in localStorage
- **Sort options on all list pages**: Add sort dropdowns (newest, popular, alphabetical) to SessionListPage and GameListPage, matching existing RecipeListPage and BlogListPage patterns
- **Consistent empty states**: Create a shared `<EmptyState>` component with optional mascot image, icon, message, and CTA button; apply across all pages (Events, Shopping, Planner, Persons, etc.)
- **Image performance**: Add `loading="lazy"` and explicit `width`/`height` to all below-fold images; convert remaining `.png` mascot images to `.webp`; fix AboutPage's 37 eagerly-loaded images
- **Global Cmd+K search**: Add a command palette overlay triggered by `Cmd+K`/`Ctrl+K` with search across all content types, quick navigation to pages, and recent search suggestions

## Capabilities

### New Capabilities
- `shared-ui-components`: Shared reusable components (Pagination, ListPageHero, EmptyState, FilterSelect, SortSelect) extracted from duplicated page-level code
- `data-visualizations`: Recharts-based chart components for nutrition breakdown, content statistics, and event trends
- `command-palette`: Global Cmd+K search overlay with content search, page navigation, and recent queries

### Modified Capabilities
- `best-practices`: Update UI patterns section with new shared component conventions, container width tiers, and skeleton loader standards
- `search`: Add command palette as additional search entry point alongside existing SearchPage

## Impact

- **Frontend only** -- no backend API changes, no schema changes, no migrations
- **React pages affected**: All list pages (Sessions, Games, Blogs, Recipes, Ingredients, ShoppingList, PackingLists), all detail pages with loading states, AdminPage, EventDashboardPage, RecipeDetailPage, MealEventDetailPage, AboutPage, HomePage, CreateGamePage, CreateSessionPage
- **New npm dependency**: `recharts` for data visualizations
- **Shared components created**: ~6 new shared components in `frontend/src/components/shared/`
- **No Pydantic/Zod schema changes** -- purely presentational
- **No Django app changes** -- frontend-only change
