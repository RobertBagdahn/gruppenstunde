## 1. Shared ContentImage Component

- [x] 1.1 Create `frontend/src/components/content/ContentImage.tsx` with props: `src: string | null`, `alt: string`, `fallbackSrc?: string`, `size?: "xs" | "sm" | "md" | "lg" | "full"`, `className?: string`, `rounded?: string`. Component renders a `div` with `aspect-square overflow-hidden` and an `<img>` with `object-cover w-full h-full loading="lazy"`. Size maps: xs=`w-8`, sm=`w-10`, md=`w-14`, lg=`w-16`, full=`w-full`. When `src` is null and no `fallbackSrc`, render a placeholder div with muted background.

## 2. Card Preview Images

- [x] 2.1 Update `frontend/src/components/content/ContentCard.tsx` — replace `h-48` image container with `aspect-square`, use `ContentImage` component with `size="full"` and `fallbackSrc="/images/inspi_flying.png"`
- [x] 2.2 Update `frontend/src/components/recipe/RecipeCard.tsx` — replace `h-48` image container with `aspect-square`, use `ContentImage` component with `size="full"` and `fallbackSrc="/images/inspi_cook.png"`
- [x] 2.3 Update `frontend/src/pages/SearchPage.tsx` — replace `h-48` search result card images with `aspect-square` using `ContentImage`
- [x] 2.4 Update `frontend/src/pages/HomePage.tsx` — replace `h-40` trending content card images with `aspect-square` using `ContentImage`
- [x] 2.5 Update `frontend/src/pages/recipes/RecipeDetailPage.tsx` similar recipes section — replace `h-32` card images with `aspect-square` using `ContentImage`

## 3. Detail Page Hero Images

- [x] 3.1 Update `frontend/src/pages/sessions/SessionDetailPage.tsx` — replace `h-64 md:h-80` hero image with `aspect-square max-w-lg mx-auto` container using `ContentImage`
- [x] 3.2 Update `frontend/src/pages/games/GameDetailPage.tsx` — replace `h-64 md:h-80` hero image with `aspect-square max-w-lg mx-auto` container using `ContentImage`
- [x] 3.3 Update `frontend/src/pages/blogs/BlogDetailPage.tsx` — replace `h-64 md:h-80` hero image with `aspect-square max-w-lg mx-auto` container using `ContentImage`
- [x] 3.4 Update `frontend/src/pages/recipes/RecipeDetailPage.tsx` — replace `max-h-96` hero image with `aspect-square max-w-lg mx-auto` container using `ContentImage`, add gradient overlay to match other content types

## 4. Thumbnail Images

- [x] 4.1 Update `frontend/src/pages/MyDashboardPage.tsx` — replace `w-10 h-10` thumbnails with `ContentImage` using `size="sm"` (aspect-square applied automatically)
- [x] 4.2 Update `frontend/src/pages/UserProfilePage.tsx` — replace `w-20 h-20` content thumbnails with `ContentImage` using appropriate size (keep profile avatars circular/unchanged)
- [x] 4.3 Update `frontend/src/pages/materials/MaterialPage.tsx` — replace `w-16 h-16` thumbnails with `ContentImage` using `size="lg"`
- [x] 4.4 Update `frontend/src/pages/materials/MaterialDetailPage.tsx` — replace `w-16 h-16` thumbnails with `ContentImage` using `size="lg"`
- [x] 4.5 Update `frontend/src/components/content/ContentLinkSection.tsx` — replace `w-14 h-14` thumbnails with `ContentImage` using `size="md"`
- [x] 4.6 Update `frontend/src/pages/planner/MealPlanDetailPage.tsx` — replace `w-8 h-8` recipe thumbnails with `ContentImage` using `size="xs"`

## 5. Verification

- [x] 5.1 Run `npm run build` in frontend to verify no TypeScript errors
- [x] 5.2 Visually verify square images render correctly in card views, detail views, and thumbnails across mobile and desktop viewports
