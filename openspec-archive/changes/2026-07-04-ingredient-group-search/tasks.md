## 1. Backend — Model & Migration

- [x] 1.1 Create `IngredientGroup` model (name, slug) in `supply/models/ingredient.py`
- [x] 1.2 Add `groups` M2M field to `Ingredient`
- [x] 1.3 Export `IngredientGroup` from `supply/models/__init__.py`
- [x] 1.4 Create migration `supply.0047_ingredientgroup_ingredient_groups`
- [x] 1.5 Run migration

## 2. Backend — Schemas

- [x] 2.1 Add `IngredientGroupOut` to `supply/schemas/reference.py`
- [x] 2.2 Add `groups` to `IngredientListOut` with resolver
- [x] 2.3 Add `groups` to `IngredientDetailOut` with resolver
- [x] 2.4 Add `group_ids` to `IngredientCreateIn`
- [x] 2.5 Add `group_ids` to `IngredientUpdateIn`
- [x] 2.6 Export `IngredientGroupOut` from `supply/schemas/__init__.py`

## 3. Backend — API

- [x] 3.1 Add `?group=` filter to `list_ingredients()`
- [x] 3.2 Extend text search to match `groups__name__icontains`
- [x] 3.3 Prefetch `groups` in list endpoint
- [x] 3.4 Wire `group_ids` in `create_ingredient()` and `update_ingredient()`
- [x] 3.5 Add group matching to `fuzzy_match.suggest_ingredients()`
- [x] 3.6 Create `supply/api/ingredient_groups.py` (CRUD, staff-only mutations)
- [x] 3.7 Export router from `supply/api/__init__.py`
- [x] 3.8 Wire router in `inspi/urls.py`

## 4. Frontend — Zod Schemas

- [x] 4.1 Add `IngredientGroupSchema` to `frontend-food/src/schemas/supply.ts`
- [x] 4.2 Add `groups` to `IngredientListItemSchema`
- [x] 4.3 Add `groups` to `IngredientDetailSchema`

## 5. Frontend — API Hooks

- [x] 5.1 Add `group` to `IngredientSearchFilters` interface
- [x] 5.2 Pass `group` param in `useIngredientSearch()`
- [x] 5.3 Add `useIngredientGroups()` hook

## 6. Frontend — Search UI

- [x] 6.1 Add group filter pills in `IngredientDetailSearchDialog`
- [x] 6.2 Show group names in ingredient result rows
- [x] 6.3 Wire `selectedGroup` state and reset logic

## 7. Dokumentation

- [x] 7.1 Update `backend/AGENTS.md` with `IngredientGroup` info
- [x] 7.2 Create OpenSpec change artifacts (proposal, design, specs, tasks)
