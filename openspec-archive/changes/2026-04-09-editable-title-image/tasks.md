## 1. Backend: Delete-Image Endpunkte

- [x] 1.1 Add `DELETE /{session_id}/image/` endpoint to `backend/session/api.py` -- sets `image` to None, returns `{ "image_url": null }`, requires auth + author/staff
- [x] 1.2 Add `DELETE /{blog_id}/image/` endpoint to `backend/blog/api.py` -- same pattern
- [x] 1.3 Add `DELETE /{game_id}/image/` endpoint to `backend/game/api.py` -- same pattern
- [x] 1.4 Add `DELETE /{recipe_id}/image/` endpoint to `backend/recipe/api/recipes.py` -- same pattern

## 2. Backend: Image-from-URL Endpunkte

- [x] 2.1 Add `POST /{session_id}/image-from-url/` endpoint to `backend/session/api.py` -- accepts `{ "image_url": str }`, downloads image from own storage, saves to `image` field, returns `{ "image_url": "<url>" }`
- [x] 2.2 Add `POST /{blog_id}/image-from-url/` endpoint to `backend/blog/api.py` -- same pattern
- [x] 2.3 Add `POST /{game_id}/image-from-url/` endpoint to `backend/game/api.py` -- same pattern
- [x] 2.4 Add `POST /{recipe_id}/image-from-url/` endpoint to `backend/recipe/api/recipes.py` -- same pattern
- [x] 2.5 Create shared utility function (e.g., in `content/services/image_service.py`) for URL validation and download logic to avoid code duplication across the four apps

## 3. Backend: Pydantic Schemas

- [x] 3.1 Add `ImageFromUrlIn` schema to `backend/content/schemas/` with `image_url: str` field
- [x] 3.2 Add `ImageOut` response schema with `image_url: str | None` field (if not already reusable from existing code)

## 4. Frontend: API Hooks

- [x] 4.1 Add `useUploadSessionImage(sessionId)` mutation hook to `frontend/src/api/sessions.ts` -- POST FormData to `/api/sessions/{id}/image/`, invalidate `['session']` and `['sessions']` caches
- [x] 4.2 Add `useUploadBlogImage(blogId)` mutation hook to `frontend/src/api/blogs.ts` -- same pattern
- [x] 4.3 Add `useUploadGameImage(gameId)` mutation hook to `frontend/src/api/games.ts` -- same pattern
- [x] 4.4 Add `useDeleteSessionImage(sessionId)` hook to `frontend/src/api/sessions.ts` -- DELETE to `/api/sessions/{id}/image/`
- [x] 4.5 Add `useDeleteBlogImage(blogId)` hook to `frontend/src/api/blogs.ts`
- [x] 4.6 Add `useDeleteGameImage(gameId)` hook to `frontend/src/api/games.ts`
- [x] 4.7 Add `useDeleteRecipeImage(recipeId)` hook to `frontend/src/api/recipes.ts`
- [x] 4.8 Add `useSetSessionImageFromUrl(sessionId)` hook to `frontend/src/api/sessions.ts` -- POST `{ image_url }` to `/api/sessions/{id}/image-from-url/`
- [x] 4.9 Add `useSetBlogImageFromUrl(blogId)` hook to `frontend/src/api/blogs.ts`
- [x] 4.10 Add `useSetGameImageFromUrl(gameId)` hook to `frontend/src/api/games.ts`
- [x] 4.11 Add `useSetRecipeImageFromUrl(recipeId)` hook to `frontend/src/api/recipes.ts`

## 5. Frontend: TitleImageEditor Komponente

- [x] 5.1 Create `frontend/src/components/content/TitleImageEditor.tsx` with props: `contentType`, `contentId`, `imageUrl`, `canEdit`, `title`, `summary`, `fallbackImage`, `onUpload`, `onDelete`, `onSetFromUrl`
- [x] 5.2 Implement the edit overlay (semi-transparent, edit button with camera icon) that only renders when `canEdit === true`
- [x] 5.3 Implement dropdown menu (shadcn/ui DropdownMenu) with three options: "Bild hochladen", "Bild mit KI generieren", "Bild entfernen"
- [x] 5.4 Implement file upload flow: hidden `<input type="file" accept="image/*">`, 500KB client-side validation, call `onUpload` mutation
- [x] 5.5 Implement AI image generation modal (shadcn/ui Dialog): prompt input pre-filled from title+summary, "Generieren" button, loading skeleton, image preview grid
- [x] 5.6 Implement image selection from AI grid: clicking an image calls `onSetFromUrl` with the selected URL, closes modal
- [x] 5.7 Implement "Bild entfernen" flow with ConfirmDialog, calls `onDelete` mutation
- [x] 5.8 Disable "Bild entfernen" option when `imageUrl` is null

## 6. Frontend: Integration in Detailseiten

- [x] 6.1 Replace static hero image in `SessionDetailPage.tsx` with `TitleImageEditor`, passing session data and mutation hooks
- [x] 6.2 Replace static hero image in `BlogDetailPage.tsx` with `TitleImageEditor`
- [x] 6.3 Replace static hero image in `GameDetailPage.tsx` with `TitleImageEditor`
- [x] 6.4 Replace static hero image in `RecipeDetailPage.tsx` with `TitleImageEditor`

## 7. Testing & Verifikation

- [x] 7.1 Test backend delete-image endpoints for all four content types (auth, permission, idempotency)
- [x] 7.2 Test backend image-from-url endpoints (valid URL, invalid URL, permission check)
- [x] 7.3 Verify frontend upload flow works end-to-end for all four content types
- [x] 7.4 Verify AI generation modal opens, generates images, and sets selected image
- [x] 7.5 Verify image removal works with confirmation dialog
- [x] 7.6 Test mobile layout (320px) -- overlay and modal render correctly
