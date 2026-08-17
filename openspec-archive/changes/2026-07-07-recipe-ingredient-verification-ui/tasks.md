## 1. Backend Security Fix (Recipe Status Protection)

- [x] 1.1 Add staff-only check in `backend/recipe/api/recipes.py` `update_recipe()` function
  - Check if `status` is in the payload and user is not staff → raise 403 error
  - Model after existing `IngredientUpdateIn` protection in `backend/supply/api/ingredients.py`
  - Error message: "Only admins can modify recipe status"

- [x] 1.2 Add test: Non-staff user cannot set recipe.status via API
  - Arrange: Create recipe owned by non-staff user
  - Act: PATCH with `{status: "approved"}`
  - Assert: 403 Forbidden, recipe.status unchanged

- [x] 1.3 Add test: Staff user CAN set recipe.status via API
  - Arrange: Create recipe, authenticate as staff user
  - Act: PATCH with `{status: "approved"}`
  - Assert: 200 OK, recipe.status == "approved"

---

## 2. Backend Schema Updates (RecipeUpdateIn)

- [x] 2.1 Update `backend/recipe/schemas/recipes.py` `RecipeUpdateIn` to include `status`, `source_url`, `authors_ids`
  - Add `status: str | None = None` (allowed values: draft, submitted, approved, rejected, archived)
  - Add `source_url: str | None = None` (URL field, max 500 chars)
  - Add `authors_ids: list[int] | None = None` (list of user IDs to add as authors/collaborators)
  - Add docstring: "Staff-only fields (status, source_url, authors_ids)"

- [x] 2.2 Update `backend/recipe/api/recipes.py` `update_recipe()` to handle authors_ids
  - If `authors_ids` is in payload and user is staff, update `recipe.authors.set(authors_ids)`
  - Validate that author IDs exist (catch `User.DoesNotExist`, return 400)
  - Add test for invalid author IDs

- [x] 2.3 Update API documentation (docstring in `update_recipe()`)
  - Document that `status`, `source_url`, `authors_ids` are staff-only
  - Include example request payload

---

## 3. Frontend: EditRecipePage - Admin Controls Section

- [x] 3.1 Add staff-only "Admin Controls" FormSection to `frontend-food/src/pages/recipes/EditRecipePage.tsx`
  - New form section visible only if `user.is_staff`
  - Implement conditional render: `{user?.is_staff && <FormSection title="Admin Controls" ...>`

- [x] 3.2 Add status selector field in Admin Controls
  - Status options: Draft, Submitted, Approved, Rejected, Archived
  - State: `[status, setStatus]` initialized from recipe data
  - Include in form submission payload

- [x] 3.3 Add source_url text input field
  - Placeholder: "e.g., https://example.com/recipe"
  - State: `[sourceUrl, setSourceUrl]`
  - Include in submission payload

- [x] 3.4 Add authors/collaborators multi-select field
  - Use existing user search/autocomplete pattern (model after scout-level/tag selection if available)
  - State: `[selectedAuthorIds, setSelectedAuthorIds]`
  - Display current authors with ability to add/remove
  - Include in submission payload

- [x] 3.5 Update form submit handler to include admin fields
  - Only send `status`, `source_url`, `authors_ids` if user is staff
  - Test: verify non-staff doesn't send these fields (no-op on frontend)

- [x] 3.6 Add test: Admin Controls section visible to staff only
  - Render EditRecipePage with staff user → verify admin section appears
  - Render EditRecipePage with non-staff user → verify admin section does NOT appear

---

## 4. Frontend: InlineIngredientEditor - Ingredient Verification Button

- [x] 4.1 Add staff-only verify button to each ingredient row in `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`
  - Button text: "Verify" (or icon button with tooltip)
  - Placement: actions menu or inline next to quantity/unit (coordinate with existing layout)
  - Only render if `user?.is_staff`

- [x] 4.2 Implement verify button click handler
  - Call `PATCH /supply/ingredients/{ingredient_slug}/` with `{status: "verified"}`
  - Show loading spinner during request
  - Disable button while in-flight
  - On success: update local ingredient.status state, show success toast
  - On error: show error toast, keep button in original state

- [x] 4.3 Add state to track verified ingredients in current edit session
  - Optimistic UI: button immediately shows "Verified" state on click
  - Revert on error

- [x] 4.4 Add test: Staff sees verify button, non-staff does not
  - Render InlineIngredientEditor with staff user → verify button visible
  - Render with non-staff user → verify button hidden

- [x] 4.5 Add test: Verify button triggers correct API call
  - Mock API, click button, verify PATCH was called with correct payload

---

## 5. Frontend: IngredientEditPage - Conditional Status Dropdown

- [x] 5.1 Update `frontend-food/src/pages/ingredients/IngredientEditPage.tsx` status dropdown
  - If user is NOT staff: replace status dropdown with display-only text
  - Display format: "Status: Entwurf" (read-only, no input)
  - If user IS staff: show existing dropdown selector

- [x] 5.2 Add conditional rendering for status field
  - Use `user?.is_staff` check
  - Non-staff branch: `<div className="...">` with read-only text
  - Staff branch: existing `<select>...</select>` logic
  - Only include status in form payload if user is staff

- [x] 5.3 Add test: Non-staff sees status as read-only
  - Render IngredientEditPage as non-staff user → verify status is not a select, just text
  - Verify no "Verified" option is visible to non-staff

- [x] 5.4 Add test: Staff sees status dropdown
  - Render IngredientEditPage as staff user → verify status is a dropdown
  - Verify all options (draft, verified, user_content) are selectable

---

## 6. Integration Testing

- [x] 6.1 E2E test: Staff edits recipe, sets status, verifies an ingredient, saves
  - Login as staff user
  - Open recipe editor
  - Set status to "approved"
  - Click verify on first ingredient
  - Save recipe
  - Verify both changes persisted in API

- [x] 6.2 E2E test: Non-staff recipe owner edits recipe but cannot touch admin fields
  - Login as non-staff recipe owner
  - Open editor
  - Verify admin section is hidden
  - Edit title, save
  - Verify recipe title updated but status/authors unchanged

- [x] 6.3 API test: Direct PATCH attempts by non-staff are blocked
  - As non-staff user, submit PATCH to `/recipes/{id}/` with status="approved"
  - Verify 403 Forbidden response

---

## 7. Documentation & Deployment

- [x] 7.1 Update backend API docstring for `update_recipe()` endpoint
  - Document staff-only field restrictions
  - Add example curl for staff vs non-staff payload

- [x] 7.2 Update migration guide or deployment notes
  - No database migration needed
  - Clarify that feature is "staff-only from day one"
  - Recommend testing the 403 rejection before rolling out

- [x] 7.3 Test locally in full dev environment
  - Start backend and frontend
  - Login as staff, verify all controls work
  - Logout, login as non-staff, verify restrictions
  - Verify error messages are user-friendly

- [x] 7.4 Code review checklist
  - [x] Security: 403 is raised for non-staff attempting status change
  - [x] API: RecipeUpdateIn schema includes all new fields
  - [x] Frontend: Admin Controls section only visible to staff
  - [x] Frontend: Verify button calls correct endpoint
  - [x] Frontend: All error toasts are user-friendly German text
  - [x] Tests: Coverage for all new code paths
  - [x] No breaking changes to existing API contracts

---

## 8. Monitoring & Verification Post-Deployment

- [x] 8.1 Monitor logs for any 403 errors on `/recipes/.../` PATCH requests (expected, normal)

- [x] 8.2 Verify in staging: staff can verify ingredients and update recipe status

- [x] 8.3 Verify in staging: non-staff cannot modify protected fields
