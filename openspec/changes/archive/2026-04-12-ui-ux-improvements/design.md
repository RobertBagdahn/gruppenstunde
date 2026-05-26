## Context

The Inspi frontend has grown across many features over time, resulting in significant visual and behavioral inconsistencies. Key observations from an audit of the current codebase:

- **5 different pagination implementations** across list pages (circular buttons, text-based prev/next, compact page indicators)
- **7+ different container max-widths** with inconsistent wrapping patterns (`container`, `mx-auto`, varying `px-*`)
- **Inconsistent hero sections**: Some list pages have gradient heroes with mascots, others have plain headers
- **Poor loading states** on several pages (single `animate-pulse` blocks instead of structured skeletons)
- **Zero data visualizations** despite rich nutrition, statistics, and trend data available
- **Missing form defaults** on CreateGamePage and CreateSessionPage
- **Missing sort options** on SessionListPage and GameListPage (Recipes and Blogs already have them)
- **Inconsistent empty states**: SearchPage uses mascot, all others use plain icon+text
- **37 images loaded eagerly** on AboutPage without `loading="lazy"` or dimensions
- **No keyboard shortcuts** for power users

This is a frontend-only change. No backend API changes, no schema changes, no database migrations.

## Goals / Non-Goals

**Goals:**
- Extract 6 shared components to eliminate duplication and enforce consistency
- Standardize visual patterns (pagination, containers, heroes, empty states, skeletons) across all pages
- Introduce data visualizations with Recharts for nutrition, admin stats, and event trends
- Improve perceived performance through lazy loading and structured skeleton loaders
- Add Cmd+K command palette for power-user navigation
- Add smart form defaults and sort options where missing

**Non-Goals:**
- Backend API changes (all improvements are frontend-only)
- Redesigning the overall layout, navigation, or color scheme
- Adding new pages or routes
- Introducing a design system/Storybook (planned separately)
- Infinite scroll or virtual list rendering
- Dark mode or theming changes
- Accessibility audit beyond what these components address

## Decisions

### Decision 1: Recharts for data visualizations

**Choice**: Recharts  
**Alternatives considered**:
- **Chart.js / react-chartjs-2**: More mature but heavier bundle, imperative API doesn't align well with React's declarative model
- **Nivo**: Beautiful charts but large bundle size, overkill for our needs
- **Visx (Airbnb)**: Low-level, requires significant custom work for basic charts
- **Custom SVG**: Maximum control but high development effort

**Rationale**: Recharts is built on React and D3, has a declarative API that fits our component model, is tree-shakeable (only import what we use), and covers our needs (PieChart, BarChart, LineChart, RadarChart). Bundle impact is ~45KB gzipped for the charts we need.

### Decision 2: Shared component location

**Choice**: `frontend/src/components/shared/` directory  
**Alternatives considered**:
- `frontend/src/components/ui/` alongside shadcn/ui components
- Feature-specific directories

**Rationale**: These are app-specific shared components (not generic UI primitives like shadcn/ui). They encode business logic (scout level colors, content type icons) and should be separate from the generic UI library. The `shared/` directory is already the convention per the project's frontend structure.

### Decision 3: Container width tiers

**Choice**: Three standardized tiers:
- `max-w-7xl` — Grid list pages (Sessions, Games, Blogs, Recipes, Search)
- `max-w-5xl` — Dashboard/management pages (Events, Ingredients, MealEvents)
- `max-w-3xl` — Detail/form pages (Create, Edit, single-item views)

All wrapped consistently with `container mx-auto px-4 sm:px-6 lg:px-8`.

**Alternatives considered**:
- Single max-width for all pages (too restrictive for grid pages, too wide for forms)
- Tailwind `container` class with responsive defaults (doesn't match our hero-section full-bleed pattern)

**Rationale**: Three tiers match the three distinct page archetypes in the app. The hero sections can break out of the container for full-bleed effect, while content below stays within the tier.

### Decision 4: Pagination style — numbered buttons

**Choice**: Numbered page buttons with prev/next arrows (current SearchPage/RecipeListPage style)  
**Alternatives considered**:
- "Mehr laden" (Load more) button pattern — spec says this is the convention
- Text-based "Vorherige/Nachste" without page numbers
- Infinite scroll

**Rationale**: The project spec defines "Mehr laden" as the standard pagination pattern. However, many existing list pages already use numbered pagination and it provides better orientation (user knows where they are in the dataset). The shared `<Pagination>` component will support both modes: numbered buttons for pages that already use them, and the "Mehr laden" pattern for new pages. This avoids a disruptive migration while standardizing the implementation.

### Decision 5: Command palette implementation

**Choice**: Custom component using shadcn/ui `Dialog` + `Command` (cmdk)  
**Alternatives considered**:
- **kbar**: Purpose-built command palette library, but adds another dependency when cmdk already ships with shadcn/ui
- **Custom from scratch**: Higher effort, lower quality

**Rationale**: shadcn/ui already includes the `Command` component (based on cmdk by Pacocoursey). Using it keeps the dependency tree minimal and ensures visual consistency with the rest of the UI. We register a global `Cmd+K` / `Ctrl+K` listener and render the palette as a Dialog.

### Decision 6: localStorage for persisting filter/sort preferences

**Choice**: Store last-used sort and filter selections per page in localStorage  
**Rationale**: URL-state remains the source of truth for shareability and bookmarkability. localStorage is only used to pre-fill defaults when a user navigates to a page without explicit URL parameters. This avoids cluttering the URL while giving returning users a personalized experience.

## Risks / Trade-offs

- **[Bundle size increase from Recharts]** ~45KB gzipped added to the bundle. **Mitigation**: Lazy-load chart components with `React.lazy()` so they're only loaded on pages that use them. Charts are not on the critical rendering path.

- **[Large refactoring surface]** Touching 15+ page components increases risk of visual regressions. **Mitigation**: Change one page at a time, visually verify each before moving to the next. No automated visual regression tests exist, so manual verification is required.

- **[Pagination pattern conflict with spec]** The best-practices spec defines "Mehr laden" as the standard, but many pages already use numbered pagination. **Mitigation**: The shared Pagination component supports both patterns. Existing numbered pagination pages keep their pattern; the spec convention applies to new pages.

- **[Command palette discoverability]** Users on mobile won't benefit from Cmd+K. **Mitigation**: The command palette is a power-user feature. On mobile, the existing search page and navigation remain the primary discovery paths. A small search icon in the header can also trigger the palette on mobile via tap.

## Open Questions

- Should the "fun facts" section on HomePage be connected to a real stats API endpoint, or replaced with a different section? (Currently hardcoded numbers that may be misleading.)
- Should the AboutPage mascot gallery use a virtualized grid or simple lazy loading? (37 images, but they're small thumbnails.)
