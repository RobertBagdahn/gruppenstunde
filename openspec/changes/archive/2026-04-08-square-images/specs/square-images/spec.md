## ADDED Requirements

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
