## Context

**Current state:**
- Recipe `status` field is unprotected on the update endpoint — any user who can edit a recipe can set it to "approved", bypassing the official approval workflow
- Ingredient `status` is correctly protected (staff-only)
- Recipe editor (`EditRecipePage.tsx`) shows metadata (title, type, summary, description, etc.) but NOT status, source_url, or authors
- Ingredient editor (`IngredientEditPage.tsx`) has status dropdown but shows it to all users, then 403 errors on save if not staff
- Ingredients can only be marked verified by navigating to a separate ingredient edit page, not from within the recipe editor
- Recipe and ingredient verification workflows are disconnected

**Stakeholders:**
- Staff/Admin users: Need quick access to verification controls in one place
- Recipe creators: Should not see verification options or make unintended modifications
- Content system: Approval workflow must be enforced consistently

**Constraints:**
- Existing Pydantic/Zod schemas must remain backward-compatible
- No database migrations needed (all fields exist)
- Staff-only logic must be consistent across backend and frontend
- Changes must follow existing approval service patterns (specifically `approve_content()` function flow)

---

## Goals / Non-Goals

**Goals:**
- Prevent non-staff users from setting `recipe.status` (security fix)
- Enable staff to verify recipes and ingredients directly in the edit UI
- Expose recipe metadata fields (`source_url`, `authors`) for management
- Improve UX by hiding verification options from non-staff users until actually permitted
- Maintain consistency with existing ingredient status protection pattern

**Non-Goals:**
- Modify the approval workflow state machine (draft → submitted → approved/rejected → archived stays the same)
- Add approval comments or detailed audit logs (already exist in `ApprovalLog`)
- Build a separate "verification dashboard" (use existing admin approval queue)
- Manage ingredient permissions or ownership (all public ingredients are editable by staff, period)
- Migrate existing recipes/ingredients to new verification states

---

## Decisions

### Decision 1: Staff-only field protection via API
**Choice:** Add explicit staff-only check in `update_recipe()` before allowing `status` modification, consistent with `update_ingredient()` pattern.

**Rationale:**
- Mirrors existing `IngredientUpdateIn` schema protection (`if data_preview.get("status") == "verified" and not _is_staff_or_admin_user(user)`)
- Centralized check at API layer (not at schema validation layer) allows normal fields to pass through
- Prevents bypass at both schema and model levels

**Alternatives considered:**
- A. Use a separate endpoint (e.g., `PATCH /recipes/{id}/staff-fields/`) — adds complexity and diverges from ingredient pattern
- B. Define staff-only fields in schema metadata — requires schema layer complexity; harder to test
- C. Check at model layer (override Recipe.save()) — invisible to API consumers, hard to debug

### Decision 2: Recipe editor staff-only section
**Choice:** Add a collapsible/conditional `<FormSection title="Admin Controls">` in `EditRecipePage.tsx` that only renders if `user.is_staff && user.is_authenticated`.

**Rationale:**
- Reuses existing form structure and styling (already has FormSection pattern from IngredientEditPage)
- Clear visual separation: staff sees red/warning styling for "Admin Controls"
- UX: staff sees all controls in one form submission, not separate API calls
- Backward compatible: non-staff editors simply don't see this section

**Alternatives considered:**
- A. Modal or separate admin panel — adds friction to the workflow
- B. Disabled fields for non-staff (show but grayed out) — confusing; users wonder why it's not clickable
- C. Redirect to /admin-approval-queue — violates "edit in one place" requirement

### Decision 3: Inline ingredient verification in InlineIngredientEditor
**Choice:** Add a staff-only "Verify" button/toggle next to each ingredient in `InlineIngredientEditor.tsx` that immediately calls `PATCH /supply/ingredients/{slug}/ {status: "verified"}`.

**Rationale:**
- No page navigation required — stays in recipe editor context
- Lightweight: single button, updates ingredient status in-place
- Consistent with existing inline actions (add, remove, quantity edit)
- Scores/storage fields remain in separate ingredient page (already mature UI there)

**Alternatives considered:**
- A. Inline edit form for all ingredient fields — bloats the recipe editor, duplicates IngredientEditPage logic
- B. Bulk "Verify all ingredients" button — useful but requires confirmation and better handled separately
- C. Verification checkbox that saves on recipe save (not immediately) — delays UI feedback

### Decision 4: UX fix for Ingredient status dropdown
**Choice:** Conditionally render `STATUS_OPTIONS` only for staff users in `IngredientEditPage.tsx`. Fallback to display-only text for non-staff ("Status: draft | User editable").

**Rationale:**
- Prevents confusing 403 errors after users try to change status
- Non-staff still see current status, just can't modify it
- Matches existing pattern: non-staff can view but not edit sensitive fields

**Alternatives considered:**
- A. Always show dropdown, let backend reject non-staff attempts — poor UX (error message after form submission)
- B. Hide entire status section from non-staff — they don't know what status an ingredient is in
- C. Show warning tooltip on hover for non-staff — still allows futile clicks

### Decision 5: No separate API endpoint for staff-only fields
**Choice:** Reuse existing `PATCH /recipes/{id}/` and `PATCH /ingredients/{slug}/` endpoints; add field-level protection logic, not a new endpoint.

**Rationale:**
- Simpler API surface (no explosion of endpoints)
- Consistent with existing patterns (recipes already have one update endpoint, ingredients already have one)
- Cleaner testing and maintenance
- OpenAPI docs can note field restrictions via description (e.g., "staff-only")

**Alternatives considered:**
- A. Separate `PUT /recipes/{id}/staff-metadata/` endpoint — creates API versioning burden, more to test
- B. GraphQL mutations with field-level auth — overkill for this project
- C. Admin-only router (`/admin/recipes/{id}/`) — discoverable but diverges from user flow

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Non-staff users attempt to set `status` via API directly (e.g., cURL)** | Backend rejects with 403. Test coverage for this case. Document in API comments. |
| **Race condition: Staff clicks "Verify" while recipe is being submitted** | Ingredient verification is independent of recipe submission. Worst case: ingredient status updated, recipe save fails — no data loss. |
| **Staff accidentally marks wrong ingredient as verified** | No confirmation dialog (one-click action). Mitigate: add hover tooltip explaining action, can be undone immediately. |
| **Recipe status changes bypass approval workflow (draft → approved without "submitted")** | By design: staff has authority to approve directly. For non-staff: API blocks this. Test and document this workflow. |
| **Ingredient edits from recipe context use slow PATCH calls** | Each ingredient update is one HTTP request. Mitigation: loading spinner, disable button during request, toast on success. Acceptable for staff workflow (infrequent). |
| **Feature parity gap: recipe owner can't see source_url/authors in edit form** | Intentional: these are staff metadata. Recipe owners see what they created; staff sees admin context. Document as design choice. |

---

## Migration Plan

**Deployment order:**
1. **Backend changes first** (Django)
   - Add field-level checks to `update_recipe()` and `update_ingredient()`
   - Update `RecipeUpdateIn` schema to include optional `status`, `source_url`, `authors`
   - Deploy + verify with integration tests

2. **Frontend changes** (React)
   - Update `EditRecipePage.tsx` with admin section
   - Update `InlineIngredientEditor.tsx` with verify button
   - Update `IngredientEditPage.tsx` with conditional status dropdown
   - Deploy + test locally

**Rollback:**
- If staff controls don't work: revert component changes, fallback to admin approval queue workflow
- If security check breaks: revert field protection, existing workflow still works
- No database rollback needed (no schema changes)

**Testing checklist:**
- [ ] Non-staff user cannot set recipe.status (403 error)
- [ ] Staff user can set recipe.status from editor
- [ ] Non-staff sees no "Admin Controls" section
- [ ] Staff sees all fields in admin section
- [ ] Ingredient verify button calls correct endpoint
- [ ] Ingredient status dropdown hidden from non-staff
- [ ] Authors field correctly maps to recipe.authors M2M
- [ ] source_url field saves and loads correctly

---

## Open Questions

1. **Authors field UX**: Should it be a searchable user dropdown, or a simple multi-select of existing authors? (Recommend: searchable dropdown, but depends on how many users exist)

2. **Verify button placement**: Next to ingredient quantity/unit, or in a right-aligned actions menu? (Recommend: actions menu if space constrained)

3. **Bulk actions**: Do staff want a "Verify all ingredients in this recipe" button for convenience? (Out of scope for MVP, but document for future)

4. **Ingredient scores/lagerung**: Should these be editable from recipe editor too, or stay in separate page? (Current: stay separate; scope-limited)
