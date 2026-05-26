# shared-ui-components Specification

## Purpose

Spezifikation für wiederverwendbare Frontend-Komponenten, die über alle Seiten konsistent eingesetzt werden. Definiert Pagination, Hero-Sections, Empty States, Filter/Sort-Dropdowns, Container-Breiten, Skeleton-Loader, Bild-Performance und Smart Form Defaults.

## Context

- **Frontend**: React 18, TypeScript (strict), Tailwind CSS, shadcn/ui
- **Icons**: Google Material Symbols (nicht Lucide)
- **Querschnittsthema**: Gilt für alle Listenseiten und Formulare

## Requirements

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

## Betroffene Dateien

| Datei | Relevanz |
|-------|----------|
| `frontend/src/components/shared/Pagination.tsx` | Shared Pagination component |
| `frontend/src/components/shared/ListPageHero.tsx` | Shared hero section component |
| `frontend/src/components/shared/EmptyState.tsx` | Shared empty state component |
| `frontend/src/components/shared/FilterSelect.tsx` | Shared filter dropdown component |
| `frontend/src/components/shared/SortSelect.tsx` | Shared sort dropdown component |
| `frontend/src/lib/persistedDefaults.ts` | LocalStorage persistence for sort/filter |
| `frontend/src/pages/sessions/SessionListPage.tsx` | Pagination, Hero, Filter, Sort, Container |
| `frontend/src/pages/games/GameListPage.tsx` | Pagination, Hero, Filter, Sort, Container |
| `frontend/src/pages/blogs/BlogListPage.tsx` | Pagination, Hero, Filter, Sort, Container |
| `frontend/src/pages/recipes/RecipeListPage.tsx` | Pagination, Hero, Container |
| `frontend/src/pages/SearchPage.tsx` | Pagination, Hero, EmptyState, Container |
| `frontend/src/pages/AboutPage.tsx` | Image lazy loading (37 images) |


---

# Square Images

## Requirements

### Requirement: Square aspect ratio on card preview images

All content card preview images (ContentCard, RecipeCard, search result cards, trending cards, similar content cards) SHALL use a 1:1 square aspect ratio with `object-cover` fitting.

#### Scenario: Content card displays square image
- **WHEN** a content card (Session, Game, Blog, or Recipe) is rendered in a list or grid
- **THEN** the card image container SHALL use `aspect-square` and the image SHALL use `object-cover` to fill the square

#### Scenario: Search result card displays square image
- **WHEN** a search result with an image is rendered on the search page
- **THEN** the result image SHALL use a 1:1 square aspect ratio with `object-cover`

#### Scenario: Trending content card on homepage
- **WHEN** a trending content card is rendered on the homepage
- **THEN** the card image SHALL use a 1:1 square aspect ratio with `object-cover`

#### Scenario: Similar content card displays square image
- **WHEN** a similar content recommendation card is rendered (e.g., similar recipes)
- **THEN** the card image SHALL use a 1:1 square aspect ratio with `object-cover`

### Requirement: Square aspect ratio on detail page hero images

All content detail page hero images (Session, Game, Blog, Recipe) SHALL use a 1:1 square aspect ratio with a max-width constraint on larger screens.

#### Scenario: Detail page hero on mobile
- **WHEN** a content detail page is rendered on a mobile viewport
- **THEN** the hero image SHALL be full-width with a 1:1 square aspect ratio and `object-cover`

#### Scenario: Detail page hero on desktop
- **WHEN** a content detail page is rendered on a desktop viewport
- **THEN** the hero image container SHALL have a max-width constraint (max-w-lg) and be centered, maintaining the 1:1 square aspect ratio

#### Scenario: Recipe detail page matches other content types
- **WHEN** a Recipe detail page is rendered
- **THEN** the hero image SHALL use the same square aspect ratio pattern as Session, Game, and Blog detail pages (including gradient overlay)

### Requirement: Square aspect ratio on thumbnail images

All content thumbnail images (dashboard, user profile, material pages, content links, meal plan) SHALL use a 1:1 square aspect ratio.

#### Scenario: Dashboard thumbnail displays square
- **WHEN** a content item is rendered in the user dashboard
- **THEN** its thumbnail image SHALL use `aspect-square` with `object-cover` and `rounded-lg`

#### Scenario: Content link thumbnail displays square
- **WHEN** a content link section renders source or target thumbnails
- **THEN** the thumbnail SHALL use `aspect-square` with `object-cover`

#### Scenario: Meal plan recipe thumbnail displays square
- **WHEN** a recipe thumbnail is rendered in the meal plan view
- **THEN** the thumbnail SHALL use `aspect-square` with `object-cover`

### Requirement: Shared ContentImage component

A reusable `ContentImage` component SHALL exist to render all content images with consistent square aspect ratio, fallback behavior, and lazy loading.

#### Scenario: ContentImage renders with image URL
- **WHEN** `ContentImage` is rendered with a valid `src` prop
- **THEN** it SHALL display the image with `aspect-square`, `object-cover`, and `loading="lazy"`

#### Scenario: ContentImage renders with null src and fallback
- **WHEN** `ContentImage` is rendered with `src={null}` and a `fallbackSrc` prop
- **THEN** it SHALL display the fallback image with the same square styling

#### Scenario: ContentImage renders with no image and no fallback
- **WHEN** `ContentImage` is rendered with `src={null}` and no `fallbackSrc`
- **THEN** it SHALL render a placeholder container with the square aspect ratio and a muted background

#### Scenario: ContentImage supports size variants
- **WHEN** `ContentImage` is rendered with a `size` prop (e.g., "sm", "md", "lg", "full")
- **THEN** it SHALL apply the appropriate width class while maintaining `aspect-square`


---

# Inspi Icon Standards

# Inspi Icon Standards

Einheitliche Darstellungsregeln für Inspi-Maskottchen-Bilder im Frontend.

### Requirement: Inspi-Bilder MÜSSEN ohne Verzerrung dargestellt werden

Alle Inspi-Maskottchen-Bilder (`<img>`-Elemente mit Inspi-Quelldateien) MÜSSEN ihr natürliches Aspekt-Ratio beibehalten. Es DARF NICHT vorkommen, dass sowohl Breite als auch Höhe fest gesetzt werden ohne `object-contain` oder `object-cover`.

#### Scenario: Footer-Icon wird nicht verzerrt

- **WHEN** ein Nutzer eine beliebige Seite lädt und das Footer-Icon sichtbar wird
- **THEN** MUSS das `inspi_front_normal.webp`-Bild mit `w-14 h-auto` oder vergleichbarem Aspekt-Ratio-sicheren Styling dargestellt werden

#### Scenario: Header-Logo behält Aspekt-Ratio

- **WHEN** ein Nutzer eine beliebige Seite lädt
- **THEN** MUSS das Header-Logo (`inspi_thinking.webp`) mit `h-9 w-auto` dargestellt werden (bereits korrekt, keine Änderung nötig)

### Requirement: Inspi-Illustrationen in Cards MÜSSEN vollständig sichtbar sein

Card-Fallback-Bilder (wenn kein User-Upload vorhanden) MÜSSEN `object-contain` statt `object-cover` verwenden, damit die Inspi-Figur vollständig sichtbar ist und nicht abgeschnitten wird. Der Container MUSS einen dezenten Hintergrund haben, damit der leere Raum um die Figur nicht störend wirkt.

#### Scenario: RecipeCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine RecipeCard ohne User-Bild gerendert wird und `inspi_cook.png` als Fallback verwendet wird
- **THEN** MUSS das Bild mit `object-contain` in einem `aspect-square`-Container mit Padding (`p-4`) und Hintergrund (`bg-muted/30`) dargestellt werden

#### Scenario: BlogCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine BlogCard ohne User-Bild gerendert wird und `inspi_flying.png` als Fallback verwendet wird
- **THEN** MUSS das Bild mit `object-contain` in einem `aspect-square`-Container mit Padding und Hintergrund dargestellt werden

#### Scenario: ContentCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine ContentCard ohne User-Bild gerendert wird
- **THEN** MUSS das Fallback-Inspi-Bild mit `object-contain` dargestellt werden

#### Scenario: TitleImageEditor-Fallback zeigt vollständiges Inspi

- **WHEN** ein Detail-Page-Hero kein User-Bild hat und das Fallback-Inspi angezeigt wird
- **THEN** MUSS das Bild mit `object-contain` und Padding in einem `aspect-square`-Container dargestellt werden

### Requirement: Keine Inspi-Bilder am linken oder rechten Rand

Dekorative Inspi-Bilder DÜRFEN NICHT mit negativer Positionierung (`-left-*`, `-right-*`) über den Container-Rand hinausragen. Dekorative Rand-Inspi-Bilder MÜSSEN entfernt werden.

#### Scenario: HomePage-Hero hat keine Rand-Dekorationen

- **WHEN** ein Nutzer die HomePage lädt
- **THEN** DÜRFEN KEINE Inspi-Bilder mit `absolute` Positionierung am linken oder rechten Rand der Hero-Sektion sichtbar sein

#### Scenario: HomePage-CTA hat keine Rand-Dekoration

- **WHEN** ein Nutzer zur CTA-Sektion der HomePage scrollt
- **THEN** DARF KEIN dekoratives Inspi-Bild am Rand der CTA-Sektion angezeigt werden

### Requirement: Einheitliche Hero-Maskottchen-Größen

Hero-Maskottchen-Bilder auf verschiedenen Seiten MÜSSEN einheitliche Größen-Patterns verwenden. Standard-Seiten (Impressum, Datenschutz, ToolLanding) verwenden `w-36 md:w-48 h-auto`. Hauptseiten (Home, About) verwenden `w-48 md:w-64 h-auto`.

#### Scenario: ImpressumPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer die ImpressumPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-36 md:w-48 h-auto` dargestellt werden

#### Scenario: DatenschutzPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer die DatenschutzPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-36 md:w-48 h-auto` dargestellt werden

#### Scenario: AboutPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer die AboutPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-48 md:w-64 h-auto` dargestellt werden

#### Scenario: ToolLandingPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer eine ToolLandingPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-36 md:w-48 h-auto` dargestellt werden

### Requirement: SearchPage-Icon MUSS aspekt-ratio-sicher sein

Das Inspi-Icon in der SearchPage-Hero-Sektion MUSS `w-auto` explizit setzen, um Verzerrung durch CSS-Resets zu verhindern.

#### Scenario: SearchPage-Hero-Icon ist nicht verzerrt

- **WHEN** ein Nutzer die SearchPage auf einem Desktop-Bildschirm lädt
- **THEN** MUSS das `inspi_filter.png`-Bild mit `h-20 md:h-28 w-auto` dargestellt werden

### Requirement: Dateinamen MÜSSEN konsistent lowercase sein

Alle Inspi-Bilddateien im `frontend/public/images/`-Verzeichnis MÜSSEN mit dem Prefix `inspi_` (lowercase) beginnen. Keine Großbuchstaben in Dateinamen.

#### Scenario: Inspi_filter.png wird zu inspi_filter.png

- **WHEN** das Projekt gebaut oder deployed wird
- **THEN** MUSS die Datei `inspi_filter.png` (lowercase) existieren und alle Referenzen MÜSSEN auf den lowercase-Namen zeigen

### Requirement: Keine doppelten Einträge in der Inspi-Gallery

Die AboutPage-Inspi-Gallery DARF KEINE doppelten Bildquellen enthalten.

#### Scenario: Gallery hat einzigartige Einträge

- **WHEN** ein Nutzer die AboutPage lädt und zur Inspi-Gallery scrollt
- **THEN** MUSS jedes Bild in der Gallery genau einmal erscheinen (kein Duplikat von `inspi_front_kopfhoerer.webp`)


---

# Data Visualizations

# data-visualizations Specification

## Purpose

Spezifikation für Recharts-basierte Datenvisualisierungen auf verschiedenen Seiten der Inspi-Plattform. Definiert Ernährungs-Tortendiagramm, Content-Statistik-Balkendiagramm und Nährstoff-Balance-Diagramm.

## Context

- **Frontend**: React 18, TypeScript (strict), Recharts v3
- **Lazy Loading**: Alle Chart-Komponenten werden via `React.lazy()` geladen
- **Querschnittsthema**: Charts werden in spezifische Seiten integriert

## Requirements

### Requirement: Nutrition pie chart on RecipeDetailPage

The RecipeDetailPage SHALL display a pie chart showing macronutrient distribution (protein, fat, carbohydrates) using Recharts.

#### Scenario: Pie chart renders with nutrition data
- **WHEN** a recipe has nutritional data (protein, fat, carbohydrates per serving)
- **THEN** a `<PieChart>` SHALL be displayed in the nutrition section
- **THEN** the chart SHALL show three segments: Eiweiss (protein), Fett (fat), Kohlenhydrate (carbohydrates)
- **THEN** each segment SHALL be labeled with the nutrient name and gram value
- **THEN** the chart SHALL use distinct colors per nutrient (e.g., blue for protein, yellow for fat, green for carbs)

#### Scenario: Pie chart hidden when no data
- **WHEN** a recipe has no nutritional data
- **THEN** the pie chart SHALL NOT be rendered
- **THEN** the existing text-based nutrition display SHALL remain as fallback

### Requirement: Content statistics bar chart on AdminPage

The AdminPage SHALL display a bar chart showing content count per content type.

#### Scenario: Bar chart renders content statistics
- **WHEN** the admin page loads with content statistics
- **THEN** a `<BarChart>` SHALL display bars for each content type (GroupSession, Game, Blog, Recipe)
- **THEN** each bar SHALL be colored according to the content type's theme color
- **THEN** the y-axis SHALL show count values
- **THEN** the x-axis SHALL show content type labels in German

#### Scenario: Admin page replaces number-only cards
- **WHEN** the admin page displays content statistics
- **THEN** the existing number-only stat cards SHALL remain above the chart
- **THEN** the bar chart SHALL be displayed below the stat cards as an additional visualization

### Requirement: Nutrient balance chart on MealEventDetailPage

The MealEventDetailPage NutritionView SHALL display a stacked bar chart showing nutrient distribution per meal day.

#### Scenario: Stacked bar chart renders per day
- **WHEN** a meal event has multiple days with assigned recipes
- **THEN** a `<BarChart>` with stacked bars SHALL show protein, fat, and carbohydrate totals per day
- **THEN** each nutrient SHALL be a distinct color consistent with the RecipeDetailPage pie chart colors
- **THEN** hovering over a bar segment SHALL show a tooltip with the exact gram value

#### Scenario: Chart hidden for events without nutrition data
- **WHEN** a meal event has no recipes assigned or no nutrition data available
- **THEN** the chart SHALL NOT be rendered

### Requirement: Recharts lazy loading

All Recharts components SHALL be lazy-loaded to minimize initial bundle impact.

#### Scenario: Chart components are code-split
- **WHEN** a page with charts is loaded
- **THEN** Recharts components SHALL be loaded via `React.lazy()` with dynamic import
- **THEN** a skeleton placeholder SHALL be shown while the chart component loads
- **THEN** pages without charts SHALL NOT include any Recharts code in their bundle

---

# EntityLink as Canonical Link Mechanism

### Requirement: EntityLink is the canonical cross-entity link mechanism
The `<EntityLink>` component (see `entity-link` capability) SHALL be the canonical way to render links to content entities across the frontend. Direct usage of `<Link>` or `<a>` to an entity detail route is discouraged outside of the component itself.

The NewTab policy (list context → new tab, detail context → same tab) SHALL be documented in `frontend/AGENTS.md` so contributors follow it when adding new pages.

#### Scenario: New page renders entity links correctly
- **WHEN** a contributor adds a new list-style page
- **THEN** the page SHALL wrap its content in `<EntityLinkContext value="list">`
- **AND** any entity name rendered in cards/rows SHALL use EntityLink

#### Scenario: AGENTS.md documents the policy
- **WHEN** a reviewer checks `frontend/AGENTS.md`
- **THEN** a section "Entity-Links & NewTab-Policy" SHALL describe: the component, the URL resolution table, the context wrapper, and the "list opens new tab / detail stays same tab" rule


---

## Betroffene Dateien

| Datei | Relevanz |
|-------|----------|
| `frontend/src/components/charts/NutritionPieChart.tsx` | Macro-nutrient pie chart |
| `frontend/src/components/charts/ContentStatsBarChart.tsx` | Content type bar chart |
| `frontend/src/components/charts/NutrientBalanceChart.tsx` | Nutrient balance stacked bar chart |
| `frontend/src/pages/recipes/RecipeDetailPage.tsx` | NutritionPieChart integration |
| `frontend/src/pages/AdminPage.tsx` | ContentStatsBarChart integration |
| `frontend/src/pages/planning/MealEventDetailPage.tsx` | NutrientBalanceChart integration |

## Navigation

### Requirement: Primary navigation single-location policy for tool entries

The primary navigation (Desktop header, Mobile bottom-nav, Mobile more-menu) SHALL contain each tool entry at most once per user-facing surface. A tool MUST NOT appear both as a top-level link and inside the Tools dropdown / Tools section at the same time.

The Footer MAY reference any tool additionally, since it serves as a site-wide index and is not part of the primary interactive navigation.

This policy SHALL be documented in `frontend/AGENTS.md` so future tool additions follow it.

#### Scenario: Events is not duplicated in desktop navigation
- **WHEN** an authenticated user views the desktop header navigation
- **THEN** "Aktionen" (Events) SHALL appear exactly once as a top-level link
- **AND** "Aktionen" SHALL NOT appear inside the Tools dropdown

#### Scenario: Events is not duplicated in mobile more-menu
- **WHEN** an authenticated user opens the mobile more-menu
- **THEN** "Aktionen" (Events) SHALL NOT appear inside the Tools section of that menu
- **AND** the Mobile bottom-nav SHALL continue to show the "Aktionen" tab

#### Scenario: Footer can still link to Events
- **WHEN** a user scrolls to the footer
- **THEN** "Aktionen" MAY appear as a footer link regardless of its placement in primary navigation

#### Scenario: Policy applies to all tools, not only Events
- **WHEN** a new tool entry is added to the frontend navigation
- **THEN** the contributor MUST place it either as a top-level primary-nav entry OR inside the Tools dropdown/section, never both
