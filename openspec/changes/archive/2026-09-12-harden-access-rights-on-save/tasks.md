## 1. Event location & meeting point authorization

- [x] 1.1 Add ownership check (created_by == user OR staff) to `update_location` and `delete_location` in `backend/event/api/locations.py`
- [x] 1.2 Restrict `update_meeting_point` in `backend/event/api/meeting_points.py` to creator or group admin
- [x] 1.3 Add negative tests for locations and meeting points (unrelated user -> 403/404, no mutation)

## 2. Packing list clone & export authorization

- [x] 2.1 Add visibility/user_can_edit check to `clone_packing_list` in `backend/packinglist/api.py`
- [x] 2.2 Add auth + visibility check to `export_text` in `backend/packinglist/api.py`
- [x] 2.3 Add negative tests (anonymous export, private clone without permission)

## 3. Content link authorization

- [x] 3.1 Add read check for source and target in `create_content_link` in `backend/content/api/content_links.py`
- [x] 3.2 Add tests for private-target link rejection and anonymous link rejection

## 4. Public profile privacy

- [x] 4.1 Filter shopping lists and meal plans by visibility in `backend/profiles/api/profile.py` (`get_public_user_food_profile`)
- [x] 4.2 Add tests asserting private lists/plans are absent from public profile

## 5. Food delete authorization

- [x] 5.1 Change `can_delete` in `backend/content/services/food_access.py` so editor collaborators cannot delete (owner/admin/staff only)
- [x] 5.2 Add tests for editor collaborator delete -> 403

## 6. Content status moderation

- [x] 6.1 Make `status` staff-only in game/blog/session PATCH handlers (or central update logic)
- [x] 6.2 Add tests that a non-staff author cannot self-approve content

## 7. Planner & waitlist escalation

- [x] 7.1 Restrict `group_id` mutation in `backend/planner/api/planner.py` to owner/admin
- [x] 7.2 Add invitation + person-ownership checks to `join_waitlist` in `backend/event/api/waitlist.py`
- [x] 7.3 Add negative tests for both

## 8. Verification

- [x] 8.1 Run `uv run python manage.py makemigrations --check`
- [x] 8.2 Run `uv run pytest`
