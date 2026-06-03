## Context

The food planning tool's weekly calendar view (`TableView.tsx`) currently has a dynamic grid layout that only renders cells for existing `Meal` objects. This results in an empty, uneven, or hard-to-interact-with interface when a plan is partially filled. Additionally, users lack an intuitive way to add recipes or direct ingredients with custom scaling factors and inline notes.

On the backend, the shopping list generator (`shopping_service.py`) fails to include direct single-ingredient items (since it only processes ingredients within linked recipes). It also ignores meal-specific portion overrides, applying only the plan-level global scaling factor. Furthermore, several batch-based recipes are configured incorrectly in the database, resulting in inflated shopping list quantities.

## Goals / Non-Goals

**Goals:**
- Redesign `TableView.tsx` into a predictable 5-meal weekly grid (Frühstück, Mittagessen, Abendessen, Snack, Dessert).
- Provide quick actions ("+ Rezept", "+ Zutat", "+ Notiz") in empty grid cells that auto-initialize a new Meal slot.
- Implement inline controls for setting factor overrides and editable notes.
- Fix backend shopping list calculation to aggregate direct single-ingredient items.
- Correctly scale ingredient quantities using meal-level `override_portions` instead of global plan-level factors.
- Remap or adjust scaling calculations for batch-based recipe structures.

**Non-Goals:**
- Redesign other views of the meal planner (e.g., list views or calendar timeline views).
- Implement general-purpose drag-and-drop meal rearrangement in this change.

## Decisions

### 1. Always-Visible Grid Structure in TableView
We will refactor `TableView.tsx` to generate a static grid where:
- Columns = All scheduled dates of the meal plan.
- Rows = The 5 fixed meal types (`breakfast`, `lunch`, `dinner`, `snack`, `dessert`).
- Cells = The matching `Meal` object if it exists; otherwise, a placeholder cell rendering "+ Rezept", "+ Zutat", "+ Notiz" quick action buttons.

*Rationale*: A static grid provides visual consistency, eliminates layout shifting as meals are added/removed, and offers clear, immediate entry points.
*Alternatives Considered*:
- Keep the current dynamic layout: Too difficult for users to target specific dates/meal types.
- A popup form: Higher cognitive load and extra clicks.

### 2. Auto-Creation of Meal Slots
When a user clicks one of the placeholder quick actions in an empty cell, the client will immediately send a `POST` request to `/api/meal-plans/{id}/meals/` with the specific date and meal type to create the underlying `Meal` object, then open the corresponding interaction dialog.

*Rationale*: Guarantees that the UI state matches the server state and avoids complex local-only state management.
*Alternatives Considered*:
- Client-side draft state: Creating meals purely on the client and batch-saving would complicate multi-user real-time collaborations and schema validation.

### 3. Direct Ingredient Aggregation in Shopping Service
Modify `shopping_service.py` to loop over all `MealItem`s in the plan. If a `MealItem` has `ingredient` populated but no `recipe`, calculate its required amount using:
`quantity * portion_weight_g * meal_scaling` (where `meal_scaling` is determined by the portion scaling logic).

*Rationale*: Completes the data model integration of direct single-ingredients in plans.

### 4. Portion Override Scaling in Shopping Service
Adjust `shopping_service.py` to calculate the scaling factor dynamically per `Meal`:
- If `meal.override_portions` is set and greater than 0: `meal_scaling = meal.override_portions / reference_portions`
- Otherwise: `meal_scaling = meal_plan.scaling_factor` (derived from global plan portions / reference portions).

*Rationale*: Ensures shopping list volumes match actual planned portions when specific meals (e.g., guest dinners) differ from the global camp size.

## Risks / Trade-offs

- **[Risk]**: Users might accidentally click quick actions and create empty meal slots.
  - **Mitigation**: Empty `Meal` slots that have no items, notes, or overrides will be cleared by a defensive backend utility or rendered transparently without bloat.
- **[Risk]**: Highly populated grids can overflow small screens.
  - **Mitigation**: Implement a horizontal scroll wrapper (`overflow-x-auto`) for the table on mobile devices, keeping the columns readable.

## Affected Files

- **Backend**:
  - `backend/supply/services/shopping_service.py` (aggregate direct ingredients, handle portion overrides)
- **Frontend**:
  - `frontend-food/src/pages/planning/TableView.tsx` (redesign to 5-meal grid, add quick-action placeholders, add inline controls)
  - `frontend-food/src/pages/planning/MealEventDetailPage.tsx` (ensure proper mutations are propagated)
