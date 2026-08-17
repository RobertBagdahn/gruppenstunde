# Recipe & Ingredient Verification UI — Deployment Checklist

## Pre-Deployment Verification

### Backend Verification
- [ ] Run backend tests: `pytest backend/recipe/tests/test_api.py::TestUpdateRecipe -v`
  - Verify: `test_non_staff_cannot_set_status` ✅
  - Verify: `test_staff_can_set_status` ✅
  - Verify: `test_staff_can_set_authors` ✅
  - Verify: `test_invalid_author_ids_rejected` ✅

- [ ] Check API documentation is updated
  - File: `backend/recipe/api/recipes.py`
  - Docstring: Contains staff-only field restrictions and example payloads

- [ ] Verify no database migrations needed
  - Recipe model unchanged
  - Ingredient model unchanged
  - RecipeUpdateIn schema only adds optional fields

### Frontend Verification
- [ ] Run frontend tests: `npm run test` in `frontend-food/`
  - Verify: `EditRecipePage.test.tsx` tests pass ✅
  - Verify: `IngredientEditPage.test.tsx` tests pass ✅

- [ ] Check component rendering
  - File: `frontend-food/src/pages/recipes/EditRecipePage.tsx`
    - Admin Controls section renders only for `user?.is_staff`
    - Status dropdown, Source URL input, Authors field present
  - File: `frontend-food/src/pages/ingredients/IngredientEditPage.tsx`
    - Status field shows dropdown for staff, read-only text for non-staff
  - File: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`
    - Verify button visible only for staff users
    - Green "verified" icon visible

---

## Staging Deployment Steps

### 1. Deploy Backend
```bash
cd backend
python manage.py test recipe.tests.test_api::TestUpdateRecipe
```

### 2. Deploy Frontend
```bash
cd frontend-food
npm run build
# Verify no TypeScript errors
npm run lint
```

### 3. Manual Testing - Staff User

#### Test Recipe Status Update
1. Login as staff user
2. Navigate to recipe editor: `/recipes/{slug}/edit`
3. Scroll to "Admin-Kontrollen" section
4. Verify section contains:
   - [ ] Status dropdown (Entwurf, Eingereicht, Genehmigt, Abgelehnt, Archiviert)
   - [ ] Source URL input field
   - [ ] Authors/Collaborators field
5. Change status to "approved"
6. Add source URL: `https://example.com/recipe`
7. Click Save
8. Verify recipe shows status="approved" in database

#### Test Ingredient Verification
1. On recipe detail page, scroll to ingredients
2. Enter edit mode (click pencil icon)
3. Locate first ingredient row
4. Verify green checkmark button is visible (staff only)
5. Click verify button
6. Verify success toast: "Zutat als verifiziert markiert"
7. Check database: ingredient.status should be "verified"

#### Test IngredientEditPage Status Field
1. Navigate to ingredient detail: `/ingredients/{slug}`
2. Click Edit button
3. Scroll to "Stammdaten" section
4. Verify Status field is a **dropdown** (not read-only)
5. Change status to "verified"
6. Save
7. Verify ingredient shows status="verified"

### 4. Manual Testing - Non-Staff User

#### Test Recipe Edit Restriction
1. Login as non-staff user
2. Navigate to recipe editor: `/recipes/{slug}/edit` (must be recipe owner)
3. Scroll down
4. Verify **NO "Admin-Kontrollen" section is visible**
5. Edit title and save
6. Verify recipe title updated ✅
7. Verify status field was NOT sent to API

#### Test IngredientEditPage Read-Only Status
1. Navigate to ingredient detail: `/ingredients/{slug}` (must be creator/editor)
2. Click Edit button
3. Scroll to "Stammdaten" section
4. Verify Status field shows **read-only text** (e.g., "Entwurf")
5. Verify it's NOT a dropdown select
6. Try to edit another field (name, description)
7. Save
8. Verify name/description updated ✅
9. Verify status was NOT modified

#### Test Verify Button Blocked
1. On recipe detail page, enter edit mode (must be recipe owner)
2. Scroll to ingredients
3. Verify **NO green verify checkmark button is visible**
4. Verify only quantity/note editing controls show

### 5. API Testing

#### Test Non-Staff Status Rejection
```bash
# As non-staff user
curl -X PATCH http://localhost:8000/api/recipes/123/ \
  -H "Authorization: Bearer non_staff_token" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'

# Expected response: 403 Forbidden
# {"detail": "Nur Admins können den Rezept-Status ändern"}
```

#### Test Staff Status Update
```bash
# As staff user
curl -X PATCH http://localhost:8000/api/recipes/123/ \
  -H "Authorization: Bearer staff_token" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "source_url": "https://example.com", "authors_ids": [1, 2]}'

# Expected response: 200 OK with updated recipe
```

---

## Production Rollout

### Pre-Production Checklist
- [ ] All backend tests passing
- [ ] All frontend tests passing
- [ ] Manual testing completed in staging
- [ ] No console errors in browser dev tools
- [ ] No API error logs related to new fields

### Deployment
- [ ] Deploy backend to production
  - No database migrations needed
  - Restart Django application server
- [ ] Deploy frontend to production
  - Build production bundle
  - Deploy to CDN/static host
  - Clear browser caches

### Post-Deployment Verification
- [ ] Monitor application logs for errors
  - Expected: 403 errors when non-staff attempt status update (normal)
  - Unexpected: 500 errors, validation errors
- [ ] Verify staff user can:
  - [ ] Set recipe status through UI
  - [ ] Update source URL
  - [ ] Add recipe authors
  - [ ] Verify ingredients inline
- [ ] Verify non-staff user:
  - [ ] Cannot see Admin Controls section
  - [ ] Cannot see status dropdown in IngredientEditPage
  - [ ] Can still edit basic recipe fields
  - [ ] Can still edit ingredient master data (non-status fields)

### Rollback Plan
If critical issues discovered:
1. Revert backend code to previous version
2. Revert frontend code to previous version
3. No database rollback needed (no schema changes)
4. Clear CDN caches
5. Notify users of temporary unavailability

---

## Monitoring Post-Deployment

### Metrics to Watch
- **400/403 Error Rate**: Monitor for unusual spikes (indicator of attempted bypasses)
- **Recipe API Latency**: Verify no performance regression
- **Ingredient API Latency**: Verify verify button doesn't create slow queries

### Logs to Check
- Recipe status change attempts by non-staff (expected 403s)
- Ingredient verification attempts (should show success)
- Any validation errors on new fields

### Expected Behavior
- ✅ Non-staff users see 403 when attempting to modify status
- ✅ Staff users can modify status/source_url/authors without errors
- ✅ Toast notifications appear for all user actions
- ✅ Ingredient verification shows immediate success feedback

---

## Success Criteria

**The deployment is successful when:**

1. ✅ Staff can set recipe status through UI
2. ✅ Staff can add source URLs to recipes
3. ✅ Staff can set recipe authors
4. ✅ Staff can verify ingredients inline (green button click → verified status)
5. ✅ Non-staff cannot see or access admin controls
6. ✅ Non-staff receives 403 error if attempting direct API status change
7. ✅ All user-facing error messages are in German
8. ✅ No database migrations required
9. ✅ All existing recipe/ingredient functionality works unchanged
10. ✅ Tests pass on production deployment
