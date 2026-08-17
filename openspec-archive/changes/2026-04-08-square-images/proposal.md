## Why

Content images across the platform use inconsistent fixed heights (`h-48`, `h-64`, `h-40`, `h-32`, `max-h-96`) instead of a consistent aspect ratio, resulting in unpredictable cropping depending on the source image dimensions. Switching to square (1:1) images everywhere creates visual consistency, works well on mobile-first layouts, and makes the design feel more intentional and clean.

## What Changes

- **Replace all fixed-height image styling with `aspect-square`** in card/preview components (`ContentCard`, `RecipeCard`, search results, HomePage trending cards, similar recipe cards)
- **Replace detail page hero images with square aspect ratio** on all four detail pages (SessionDetailPage, GameDetailPage, BlogDetailPage, RecipeDetailPage)
- **Unify the Recipe detail hero** to match the same pattern as Session/Game/Blog (currently uses different sizing and no gradient overlay)
- **Create a shared `ContentImage` component** to eliminate the 15+ duplicated inline `<img>` patterns and enforce square aspect ratio consistently
- **Update all thumbnail images** (dashboard, user profile, material page, content links, meal plan) to use `aspect-square` with consistent sizing

## Capabilities

### New Capabilities

- `square-images`: Enforce square (1:1) aspect ratio for all content images across preview cards and detail views, with a shared image component

### Modified Capabilities

_(none -- this is a pure UI/styling change with no spec-level behavior changes)_

## Impact

- **Frontend components affected**:
  - `ContentCard.tsx`, `RecipeCard.tsx` (card images)
  - `SessionDetailPage.tsx`, `GameDetailPage.tsx`, `BlogDetailPage.tsx`, `RecipeDetailPage.tsx` (hero images)
  - `SearchPage.tsx` (search result cards)
  - `HomePage.tsx` (trending content cards)
  - `MyDashboardPage.tsx`, `UserProfilePage.tsx`, `MaterialPage.tsx`, `MaterialDetailPage.tsx` (thumbnails)
  - `ContentLinkSection.tsx`, `MealPlanDetailPage.tsx` (small thumbnails)
- **No backend changes** -- image URLs and schemas remain unchanged
- **No Pydantic/Zod schema changes** -- `image_url: string | null` stays the same
- **No migrations required**
- **No API changes**
