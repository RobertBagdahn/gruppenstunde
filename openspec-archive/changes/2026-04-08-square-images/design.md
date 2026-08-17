## Context

Content images are currently rendered with inconsistent fixed heights across the platform:
- Card previews: `h-48` (ContentCard, RecipeCard, SearchPage), `h-40` (HomePage), `h-32` (similar recipes)
- Detail heroes: `h-64 md:h-80` (Session, Game, Blog), `max-h-96` (Recipe)
- Thumbnails: varying sizes from `w-8 h-8` to `w-20 h-20`

There is no shared image component -- every image is an inline `<img>` tag duplicated across 15+ locations with minor variations. The Recipe detail page uses a different pattern than the other three content types (no gradient overlay, different sizing).

## Goals / Non-Goals

**Goals:**
- All content images (cards and detail views) use a 1:1 square aspect ratio
- Consistent visual language across all content types
- Single shared `ContentImage` component to reduce duplication
- Unify the Recipe detail hero pattern with Session/Game/Blog

**Non-Goals:**
- Backend image processing changes (cropping, resizing)
- Image upload UI changes
- Profile picture styling (avatars remain circular)
- Event or packing list images (out of scope)

## Decisions

### 1. Use Tailwind `aspect-square` instead of fixed heights

**Decision**: Replace all `h-48`, `h-64 md:h-80`, `max-h-96` etc. with `aspect-square` on image containers.

**Rationale**: `aspect-square` is responsive and adapts to container width. Fixed heights cause unpredictable cropping depending on container width (a 192px tall image in a 400px wide container has a very different aspect ratio than in a 300px wide container). With `aspect-square`, the image always shows a consistent 1:1 crop regardless of screen size.

**Alternative considered**: `aspect-[4/3]` or `aspect-video` -- rejected because the user explicitly wants square images. Square also works well with mobile-first layouts where cards are often near-full-width.

### 2. Create a shared `ContentImage` component

**Decision**: Create `frontend/src/components/content/ContentImage.tsx` with props for `src`, `alt`, `fallbackSrc`, `size` (for thumbnails), and optional `className` override.

**Rationale**: Images are currently duplicated in 15+ places with the same pattern (`object-cover`, `loading="lazy"`, fallback logic). A shared component:
- Enforces square aspect ratio in one place
- Standardizes fallback behavior
- Reduces code duplication
- Makes future styling changes trivial

**Alternative considered**: Just update all inline `<img>` tags without a component. Rejected because the duplication would remain and future changes would require touching 15+ files again.

### 3. Keep `object-cover` for image fitting

**Decision**: Use `object-cover` to fill the square container, cropping as needed.

**Rationale**: `object-cover` ensures no whitespace/letterboxing around images. Since content images are photos (activities, food, etc.), center-cropping to fill a square is visually appropriate. `object-contain` would leave empty space and look inconsistent.

### 4. Thumbnail sizes remain as contextual classes

**Decision**: Thumbnails (dashboard, meal plan, content links) use `aspect-square` but keep their existing width classes (`w-8`, `w-10`, `w-14`, `w-16`, `w-20`). The height classes (`h-8`, `h-10`, etc.) are removed since `aspect-square` derives height from width.

**Rationale**: Different contexts legitimately need different thumbnail sizes. The key change is that they become square instead of potentially rectangular.

### 5. Detail page hero: square with max-width constraint

**Decision**: Detail page heroes use `aspect-square` with `max-w-lg mx-auto` on larger screens to prevent the square from becoming excessively large on wide viewports.

**Rationale**: A full-width square on a 1440px desktop would be 1440x1440px -- far too tall. Constraining to `max-w-lg` (512px) keeps the hero image prominent but manageable. On mobile, it naturally fills the width.

**Affected files:**
- `frontend/src/components/content/ContentImage.tsx` (NEW)
- `frontend/src/components/content/ContentCard.tsx`
- `frontend/src/components/recipe/RecipeCard.tsx`
- `frontend/src/pages/sessions/SessionDetailPage.tsx`
- `frontend/src/pages/games/GameDetailPage.tsx`
- `frontend/src/pages/blogs/BlogDetailPage.tsx`
- `frontend/src/pages/recipes/RecipeDetailPage.tsx`
- `frontend/src/pages/SearchPage.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/MyDashboardPage.tsx`
- `frontend/src/pages/UserProfilePage.tsx`
- `frontend/src/pages/materials/MaterialPage.tsx`
- `frontend/src/pages/materials/MaterialDetailPage.tsx`
- `frontend/src/components/content/ContentLinkSection.tsx`
- `frontend/src/pages/planner/MealPlanDetailPage.tsx`

**No API endpoint changes.** No database migration required.

## Risks / Trade-offs

- **[Tall hero on mobile]** A full-width square on a 375px phone is 375x375px -- taller than the current `h-64` (256px). This is intentional for visual impact, but means slightly more scrolling. → Acceptable trade-off for consistency.
- **[Image crop quality]** Square crops may cut off important parts of landscape-oriented photos. → Mitigated by `object-cover` centering. Users can re-upload better-suited images. No `object-position` customization planned for now.
- **[Component migration effort]** Replacing 15+ inline image patterns is straightforward but touches many files. → Low risk since changes are purely CSS class swaps with no logic changes.
