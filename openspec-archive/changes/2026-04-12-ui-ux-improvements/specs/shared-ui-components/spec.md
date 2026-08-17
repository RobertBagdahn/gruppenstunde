## ADDED Requirements

### Requirement: Shared Pagination component

The frontend SHALL provide a shared `<Pagination>` component at `components/shared/Pagination.tsx` that all list pages MUST use for page navigation. The component SHALL support numbered page buttons with prev/next arrows.

#### Scenario: Numbered pagination display
- **WHEN** a list page renders pagination with `totalPages > 1`
- **THEN** the Pagination component SHALL display numbered page buttons
- **THEN** the current page button SHALL be visually highlighted (filled/primary color)
- **THEN** prev/next arrow buttons SHALL be displayed at the edges
- **THEN** the prev button SHALL be disabled on page 1
- **THEN** the next button SHALL be disabled on the last page

#### Scenario: Page window with ellipsis
- **WHEN** `totalPages > 7`
- **THEN** the component SHALL show at most 7 page buttons with ellipsis (`...`) for gaps
- **THEN** the first and last page SHALL always be visible
- **THEN** the current page and its immediate neighbors SHALL always be visible

#### Scenario: Pagination updates URL
- **WHEN** a user clicks a page number
- **THEN** the `page` URL query parameter SHALL be updated
- **THEN** the page SHALL scroll to the top of the list

#### Scenario: Single page hides pagination
- **WHEN** `totalPages <= 1`
- **THEN** the Pagination component SHALL render nothing

#### Scenario: Mobile-responsive pagination
- **WHEN** the viewport width is below 640px (mobile)
- **THEN** the component SHALL show a compact layout: prev button, "Seite X von Y" text, next button
- **THEN** individual page number buttons SHALL NOT be displayed on mobile

### Requirement: Shared ListPageHero component

The frontend SHALL provide a shared `<ListPageHero>` component that renders a gradient hero section for list pages with consistent structure.

#### Scenario: Hero rendering with all props
- **WHEN** a list page renders ListPageHero with `title`, `gradientClasses`, `icon`, `mascotSrc`, and `totalCount`
- **THEN** the hero SHALL display a gradient background using the provided Tailwind gradient classes
- **THEN** the hero SHALL display the title in white text
- **THEN** the hero SHALL display the Material Symbols icon
- **THEN** the hero SHALL display the mascot image on the right (desktop only, hidden on mobile)
- **THEN** the hero SHALL display a count badge showing the total number of items

#### Scenario: Hero without optional props
- **WHEN** a list page renders ListPageHero without `mascotSrc` or `totalCount`
- **THEN** the hero SHALL render without mascot image and without count badge
- **THEN** the gradient, title, and icon SHALL still render

#### Scenario: Hero is full-bleed
- **WHEN** the hero is rendered
- **THEN** it SHALL span the full viewport width regardless of the container width below it

### Requirement: Shared EmptyState component

The frontend SHALL provide a shared `<EmptyState>` component that displays a consistent empty state across all pages.

#### Scenario: Empty state with mascot
- **WHEN** a page renders EmptyState with `mascotSrc`, `title`, `description`, and `ctaLabel`/`ctaHref`
- **THEN** the component SHALL display the mascot image centered
- **THEN** the title SHALL be displayed as a heading
- **THEN** the description SHALL be displayed as body text
- **THEN** a CTA button SHALL link to `ctaHref` with the label `ctaLabel`

#### Scenario: Empty state without mascot
- **WHEN** a page renders EmptyState with `icon` instead of `mascotSrc`
- **THEN** the component SHALL display a Material Symbols icon in a muted circle
- **THEN** no mascot image SHALL be rendered

#### Scenario: Empty state without CTA
- **WHEN** `ctaLabel` and `ctaHref` are not provided
- **THEN** no button SHALL be rendered
- **THEN** only the illustration and text SHALL be displayed

### Requirement: Shared FilterSelect component

The frontend SHALL provide a shared `<FilterSelect>` component for consistent filter dropdowns across list pages.

#### Scenario: Filter rendering
- **WHEN** a list page renders FilterSelect with `label`, `options`, `value`, and `onChange`
- **THEN** the component SHALL render a dropdown with the label as placeholder text
- **THEN** selected value SHALL be visually indicated
- **THEN** an "Alle" (All) option SHALL always be the first option to clear the filter

#### Scenario: Filter updates URL
- **WHEN** a user selects a filter option
- **THEN** the corresponding URL query parameter SHALL be updated
- **THEN** the page parameter SHALL reset to 1

### Requirement: Shared SortSelect component

The frontend SHALL provide a shared `<SortSelect>` component for sort dropdowns on list pages.

#### Scenario: Sort options display
- **WHEN** a list page renders SortSelect with sort options
- **THEN** the component SHALL display options: "Neueste zuerst", "Beliebteste", "Alphabetisch (A-Z)"
- **THEN** the default selected option SHALL be "Neueste zuerst"

#### Scenario: Sort updates URL
- **WHEN** a user selects a sort option
- **THEN** the `sort` URL query parameter SHALL be updated (e.g., `?sort=newest`, `?sort=popular`, `?sort=alphabetical`)
- **THEN** the page parameter SHALL reset to 1

### Requirement: Standardized container widths

All pages SHALL use one of three standardized container width tiers with consistent padding.

#### Scenario: Grid list pages use max-w-7xl
- **WHEN** a page displays a grid of content cards (Sessions, Games, Blogs, Recipes, Search)
- **THEN** the content container SHALL use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

#### Scenario: Dashboard pages use max-w-5xl
- **WHEN** a page displays dashboard content or management views (Events, Ingredients, MealEvents)
- **THEN** the content container SHALL use `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8`

#### Scenario: Form/detail pages use max-w-3xl
- **WHEN** a page displays a form or single-item detail view (Create, Edit, GroupDetail)
- **THEN** the content container SHALL use `max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`

### Requirement: Structured skeleton loaders

All pages with loading states SHALL display skeleton loaders that match the final content layout structure.

#### Scenario: Grid page skeleton
- **WHEN** a grid list page is loading
- **THEN** the skeleton SHALL display a grid of card-shaped placeholders matching the card dimensions
- **THEN** each card placeholder SHALL show areas for image, title, and metadata

#### Scenario: Detail page skeleton
- **WHEN** a detail page is loading
- **THEN** the skeleton SHALL display placeholders matching the page sections (header, content blocks, sidebar)

#### Scenario: No single-block skeletons
- **WHEN** any page displays a loading state
- **THEN** it SHALL NOT use a single undifferentiated `animate-pulse` block
- **THEN** the skeleton MUST have at least 3 distinct placeholder areas

### Requirement: Image performance optimization

All images below the fold SHALL use lazy loading and explicit dimensions to prevent layout shift.

#### Scenario: Below-fold images use lazy loading
- **WHEN** an image is rendered below the initial viewport (below the fold)
- **THEN** the `<img>` element SHALL have `loading="lazy"` attribute

#### Scenario: Above-fold images load eagerly
- **WHEN** an image is the hero/banner image at the top of a page
- **THEN** the `<img>` element SHALL NOT have `loading="lazy"` (browser default eager loading)

#### Scenario: All images have explicit dimensions
- **WHEN** any `<img>` element is rendered
- **THEN** it SHALL have `width` and `height` attributes set
- **THEN** this prevents Cumulative Layout Shift (CLS)

#### Scenario: AboutPage gallery optimization
- **WHEN** the AboutPage mascot gallery is rendered
- **THEN** all 37+ gallery images SHALL have `loading="lazy"`
- **THEN** all gallery images SHALL have explicit `width` and `height` attributes

### Requirement: Smart form defaults

Create forms SHALL pre-populate sensible default values to reduce user effort.

#### Scenario: CreateGamePage defaults
- **WHEN** a user opens the game creation form
- **THEN** `gameType` SHALL default to `'group_game'`
- **THEN** `playArea` SHALL default to `'outdoor'`

#### Scenario: Sort and filter persistence
- **WHEN** a user selects a sort or filter option on a list page
- **THEN** the selection SHALL be stored in localStorage keyed by page name
- **WHEN** the user returns to the same list page without explicit URL parameters
- **THEN** the stored sort/filter preferences SHALL be applied as defaults

### Requirement: Sort options on all content list pages

SessionListPage and GameListPage SHALL have sort dropdowns matching RecipeListPage and BlogListPage.

#### Scenario: SessionListPage sort
- **WHEN** a user visits the sessions list page
- **THEN** a sort dropdown SHALL be displayed with options: "Neueste zuerst", "Beliebteste", "Alphabetisch (A-Z)"
- **THEN** the default sort SHALL be "Neueste zuerst"

#### Scenario: GameListPage sort
- **WHEN** a user visits the games list page
- **THEN** a sort dropdown SHALL be displayed with the same options as SessionListPage
- **THEN** the sort selection SHALL update the URL parameter `sort`
