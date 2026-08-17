## 1. Backend – Model & Migration

- [x] 1.1 Add `slug` field (SlugField, max_length=50, unique, null, blank) to `UserProfile` model in `backend/profiles/models/profile.py`
- [x] 1.2 Run migration: `uv run python manage.py makemigrations profiles && uv run python manage.py migrate profiles`

## 2. Backend – Pydantic Schemas

- [x] 2.1 Add `slug` to `UserProfileOut` (str | None)
- [x] 2.2 Add `slug` to `UserProfileUpdateIn` (str | None)
- [x] 2.3 Add `slug` to `PublicUserProfileOut` (str | None)
- [x] 2.4 Create `PublicUserFoodProfileOut` schema with `slug`, user fields, and `recipes`, `shopping_lists`, `meal_plans` sections
- [x] 2.5 Create sub-schemas: `PublicRecipeOut`, `PublicShoppingListOut`, `PublicMealPlanOut`

## 3. Backend – API Endpoint

- [x] 3.1 Add `get_public_user_food_profile` endpoint at `GET /api/profile/by-slug/{slug}/` in `backend/profiles/api/profile.py`
- [x] 3.2 Implement slug resolution: `UserProfile.objects.filter(slug=slug)` ➔ fallback `UserProfile.objects.filter(user_id=int(slug))` if slug not found
- [x] 3.3 Query public recipes (visibility=PUBLIC, status=APPROVED) where user is owner or author
- [x] 3.4 Query shopping lists where user is owner
- [x] 3.5 Query meal plans where user is created_by
- [x] 3.6 Respect `is_public` flag (owner always sees own profile)

## 4. Backend – Slug Validation

- [x] 4.1 Add slug validation in `UserProfileUpdateIn` (Django's `validate_slug` or regex)
- [x] 4.2 Handle duplicate slug error with proper HTTP 422 response in `update_my_profile`
- [x] 4.3 Handle empty string → set slug to None in `update_my_profile`

## 5. Backend – Tests

- [x] 5.1 Test: GET /api/profile/by-slug/{slug}/ with valid slug returns 200 with all sections
- [x] 5.2 Test: GET /api/profile/by-slug/{id}/ (ID fallback) returns 200
- [x] 5.3 Test: is_public=false returns 404 for other users
- [x] 5.4 Test: is_public=false returns 200 for own profile
- [x] 5.5 Test: Non-existent slug returns 404
- [x] 5.6 Test: PATCH /api/profile/me/ with slug sets slug correctly
- [x] 5.7 Test: Duplicate slug returns 422
- [x] 5.8 Test: Empty slug string clears slug to null

## 6. Frontend (food) – Zod Schemas & API Hook

- [x] 6.1 Add `slug: z.string().nullable()` to `ContentAuthorSchema` in `frontend-food/src/schemas/content.ts`
- [x] 6.2 Create `PublicUserFoodProfileSchema` and sub-schemas (`PublicRecipeSchema`, `PublicShoppingListSchema`, `PublicMealPlanSchema`) in `frontend-food/src/schemas/profile.ts`
- [x] 6.3 Add `usePublicProfile(slug: string)` hook in `frontend-food/src/api/profile.ts` using TanStack Query

## 7. Frontend (food) – Profile Page

- [x] 7.1 Create `ProfilePage.tsx` in `frontend-food/src/pages/profile/ProfilePage.tsx` with sections: User Info, Rezepte, Einkaufslisten, Essenspläne
- [x] 7.2 Add loading state (skeleton), empty state, error state (404)
- [x] 7.3 Add route `<Route path="/profile/name/:slug" element={<ProfilePage />} />` in `frontend-food/src/App.tsx`

## 8. Frontend (food) – entityUrls & Author Links

- [x] 8.1 Update `getEntityUrl` in `frontend-food/src/lib/entityUrls.ts`: user entity uses `slug` instead of `id`, falls back to `id` if no slug
- [x] 8.2 Update `ContentAuthorSection` to pass `author.slug` to `EntityLink` (add slug to `ContentAuthorSchema`)
- [x] 8.3 Update `EntityLink` to pass slug to `getEntityUrl` for user type

## 9. Schema Sync & Cleanup

- [x] 9.1 Sync Pydantic `PublicUserProfileOut` with Zod (add `slug` field)
- [x] 9.2 Remove `/profile/name` legacy redirect in main frontend if needed (not needed – main frontend stays on `/user/:userId`)
- [x] 9.3 Update backend AGENTS.md with new patterns if needed (not needed – already in change artifacts)
