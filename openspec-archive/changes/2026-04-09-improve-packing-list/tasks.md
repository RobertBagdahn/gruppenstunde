## 1. Backend Models & Migration

- [x] 1.1 Add `is_do_not_bring` BooleanField (default=False) to `PackingItem` model in `backend/packinglist/models.py`
- [x] 1.2 Add `visibility` CharField with TextChoices (`private`, `link_only`, default=`link_only`) to `PackingList` model
- [x] 1.3 Create `PackingListShare` model (packing_list FK, token UUIDField unique, label CharField, is_active BooleanField, created_at)
- [x] 1.4 Create `PackingListShareCheck` model (share FK, item FK, is_checked BooleanField, unique_together on share+item)
- [x] 1.5 Update `clone_for_user` method to preserve `is_do_not_bring` flag on cloned items
- [x] 1.6 Run `uv run python manage.py makemigrations packinglist` and verify migration

## 2. Backend Pydantic Schemas

- [x] 2.1 Add `is_do_not_bring: bool` to `PackingItemOut`, `PackingItemCreateIn` (default=False), `PackingItemUpdateIn` (optional)
- [x] 2.2 Add `visibility: str` to `PackingListOut`, `PackingListCreateIn` (default="link_only"), `PackingListUpdateIn` (optional)
- [x] 2.3 Create `ShareOut` schema (id, token, label, is_active, created_at)
- [x] 2.4 Create `ShareCreateIn` schema (label: str optional)
- [x] 2.5 Create `SharedPackingListOut` schema (packing list data with share-specific check state)
- [x] 2.6 Create `ShareCheckUpdateIn` schema (item_id: int, is_checked: bool)
- [x] 2.7 Add `shares: list[ShareOut]` to `PackingListOut` (only populated for owner/edit permission)

## 3. Backend API Endpoints

- [x] 3.1 Update `GET /api/packing-lists/{id}/` to enforce visibility check (private: 404 for non-authorized)
- [x] 3.2 Update item create/update endpoints to handle `is_do_not_bring` field
- [x] 3.3 Update packing list create/update endpoints to handle `visibility` field
- [x] 3.4 Add `POST /api/packing-lists/{id}/shares/` endpoint to create share links
- [x] 3.5 Add `GET /api/packing-lists/{id}/shares/` endpoint to list share links
- [x] 3.6 Add `DELETE /api/packing-lists/{id}/shares/{share_id}/` endpoint to deactivate share links
- [x] 3.7 Add `GET /api/packing-lists/shared/{token}/` endpoint to load packing list via share token (public, includes share check state)
- [x] 3.8 Add `PATCH /api/packing-lists/shared/{token}/checks/` endpoint to update check state for share link
- [x] 3.9 Update text export endpoint to include "Nicht mitbringen" section with ❌ prefix

## 4. Backend Admin & Tests

- [x] 4.1 Register `PackingListShare` and `PackingListShareCheck` in Django admin
- [x] 4.2 Update test factories to support `is_do_not_bring` and `visibility` fields
- [x] 4.3 Write pytest tests for visibility enforcement (private vs link_only access)
- [x] 4.4 Write pytest tests for share link CRUD endpoints
- [x] 4.5 Write pytest tests for share check state (create, update, independent from original)

## 5. Backend Seed Data

- [x] 5.1 Add "Nicht mitbringen" items to master catalog in seed command (Handy, Geld, eigene Süßigkeiten, Spielkonsolen, Schmuck/Wertgegenstände, elektronische Geräte)
- [x] 5.2 Add "Dokumente" category to master catalog (Krankenversicherungskarte, Impfpass, Teilnehmerbogen, Reisepass)
- [x] 5.3 Add "Verpflegung" category to master catalog (Trinkflasche, Brotdose, Besteck für unterwegs)
- [x] 5.4 Add "Sonstiges" category to master catalog (Sonnencreme, Insektenschutz, Mülltüten, Regenschirm)
- [x] 5.5 Enrich existing categories with additional items (Badehose, Mütze, Kissen, Ohrenstöpsel, Kompass, Taschenmesser, etc.)
- [x] 5.6 Assign "Nicht mitbringen" items to relevant templates (Sommerlager, Zeltlager, Großfahrt)
- [x] 5.7 Run seed command with `--clear` and verify all data is created correctly

## 6. Frontend Zod Schemas

- [x] 6.1 Add `is_do_not_bring: z.boolean()` to `PackingItemSchema` in `frontend/src/schemas/packingList.ts`
- [x] 6.2 Add `visibility: z.enum(["private", "link_only"])` to `PackingListSchema` and `PackingListSummarySchema`
- [x] 6.3 Create `PackingListShareSchema` (id, token, label, is_active, created_at)
- [x] 6.4 Add `shares: z.array(PackingListShareSchema).optional()` to `PackingListSchema`
- [x] 6.5 Create `SharedPackingListSchema` for share token view (list data with share-specific check state)

## 7. Frontend API Hooks

- [x] 7.1 Add `useCreateShare(packingListId)` mutation hook
- [x] 7.2 Add `usePackingListShares(packingListId)` query hook
- [x] 7.3 Add `useDeactivateShare(packingListId)` mutation hook
- [x] 7.4 Add `useSharedPackingList(token)` query hook for loading via share token
- [x] 7.5 Add `useUpdateShareCheck(token)` mutation hook for checking items on share view

## 8. Frontend — "Nicht mitbringen" UI

- [x] 8.1 Update `ItemRow` in `PackingListDetailPage` to hide checkbox and show prohibition icon + strikethrough for `is_do_not_bring` items
- [x] 8.2 Update `ProgressBar` to exclude `is_do_not_bring` items from progress calculation
- [x] 8.3 Add toggle for `is_do_not_bring` in the item detail Sheet (for users with edit permission)
- [x] 8.4 Update `QuickAddItem` to include optional "Nicht mitbringen" toggle

## 9. Frontend — Item Detail Sheet

- [x] 9.1 Create `ItemDetailSheet` component using shadcn/ui Sheet (slide-over from right)
- [x] 9.2 Display item name, quantity, description (rendered as Markdown), "Nicht mitbringen" badge, Supply link
- [x] 9.3 Make fields editable for users with edit permission (inline edit mode)
- [x] 9.4 Wire click handler on `ItemRow` to open `ItemDetailSheet` (exclude checkbox/delete clicks)
- [x] 9.5 Ensure full-width Sheet on mobile (< 640px) with prominent close button

## 10. Frontend — Visibility & Sharing UI

- [x] 10.1 Add visibility toggle (private/link_only) to packing list create form in `PackingListsPage`
- [x] 10.2 Add visibility toggle to packing list settings/header in `PackingListDetailPage`
- [x] 10.3 Display visibility indicator (icon + label) on `PackingListCard` in list view
- [x] 10.4 Create share management section in `PackingListDetailPage` ("Teilen" section with list of share links, copy-link button, deactivate button, create new link button)

## 11. Frontend — Share Link Page

- [x] 11.1 Create `PackingListSharePage` component at route `/packing-lists/shared/:token`
- [x] 11.2 Load packing list via `useSharedPackingList(token)` hook
- [x] 11.3 Display simplified read-only list view with checkboxes (share-specific check state)
- [x] 11.4 Handle "Nicht mitbringen" items (visible, not checkable, prohibition styling)
- [x] 11.5 Display progress bar based on share-specific check state
- [x] 11.6 Handle inactive/invalid share token with "Dieser Link ist nicht mehr gültig" error page
- [x] 11.7 Add route `/packing-lists/shared/:token` to `App.tsx`
