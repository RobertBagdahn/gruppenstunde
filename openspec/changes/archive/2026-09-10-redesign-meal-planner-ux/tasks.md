## 1. Backend & Schema Foundations

- [x] 1.1 Add API support for meal reordering and swapping across days (`POST /api/meal-plans/{id}/meals/reorder/`)
- [x] 1.2 Implement `plan-check` analysis endpoint returning structured actionable alerts (empty slots, budget excess, allergen conflicts)
- [x] 1.3 Ensure default empty meal slots (Breakfast, Lunch, Dinner) are populated during rapid plan creation
- [x] 1.4 Synchronize Pydantic and Zod schemas for meal plan actions, alerts, and servings fields
- [x] 1.5 Add backend unit tests for meal reordering, plan-check alert generation, and slot creation

## 2. 3-Pillar Navigation & View Switching

- [x] 2.1 Refactor `MealEventDetailPage.tsx` tab bar to 3 main tabs: Planen (`/plan`), Einkaufen (`/shopping`), and Kochen (`/cooking`)
- [x] 2.2 Implement header view switcher in Planen between Tagesplan (cards) and Tabelle
- [x] 2.3 Embed sub-tabs in Einkaufen for Einkaufsliste and Kosten & Budget
- [x] 2.4 Embed sub-views in Kochen for Zubereitungs-Zeitplan and Küchenhelfer & Allergene
- [x] 2.5 Ensure deep links and backward compatible redirect handling for legacy tab routes

## 3. Compact Meal Card & Inline Accordion

- [x] 3.1 Redesign `MealSlot.tsx` and card headers to display title, start time, persons count, costs, and up to 4 ingredient summary tags
- [x] 3.2 Implement smooth inline accordion expansion for viewing detailed ingredients and DGE nutritional bars
- [x] 3.3 Replace decimal factor inputs with cleartext servings inputs ("Portionen für X Personen") calculating internal factors automatically
- [x] 3.4 Enforce local-first edit semantics: edits apply strictly to current meal instance without altering reference templates
- [x] 3.5 Add unit tests for compact card rendering and servings-to-factor calculation

## 4. Unified Omnibar Search & Quick Add

- [x] 4.1 Create `MealOmnibarDialog.tsx` with auto-focused search input and keyboard navigation (Cmd+K / Esc / Arrow keys)
- [x] 4.2 Add filter pills `[ Alle ]`, `[ Rezepte ]`, `[ Zutaten ]`, and `[ Vorlagen/Sets ]` for concurrent querying
- [x] 4.3 Add live preview panel showing prep time, allergens, and scaled cost for group size
- [x] 4.4 Connect "+ Gericht hinzufügen" triggers in empty meal slots to the unified Omnibar dialog
- [x] 4.5 Add component tests for Omnibar filtering and recipe selection

## 5. 1-Screen Breakfast Quick Builder

- [x] 5.1 Implement `BreakfastQuickBuilder.tsx` with 4 sections: Brot & Basis, Aufstriche & Belag, Frisches & Extras, and Getränke
- [x] 5.2 Implement automatic standard portion weight calculation multiplied by group participants
- [x] 5.3 Add collapsible toggle for DGE nutrient fine-tuning (expert mode)
- [x] 5.4 Connect breakfast builder directly to breakfast slots with single-click save
- [x] 5.5 Add unit tests for breakfast standard portion auto-scaling

## 6. Drag & Drop and Meal Movement

- [x] 6.1 Integrate drag-and-drop handles on meal cards for moving meals between days
- [x] 6.2 Implement Dreipunkt-Menü actions ("Verschieben nach Tag X", "Kopieren auf weitere Tage") as accessible fallback
- [x] 6.3 Connect movement mutations with optimistic UI reordering and error rollbacks
- [x] 6.4 Verify mobile touch behavior and fallbacks

## 7. Optimistic Deletion & Toast Undo

- [x] 7.1 Implement optimistic cache updates in `useRemoveMealItem` removing items immediately without confirm modal
- [x] 7.2 Show 6-second sonner toast with active `[ Rückgängig ]` button triggering cache and mutation rollback
- [x] 7.3 Retain explicit `ConfirmDialog` for destructive full meal or full day deletions
- [x] 7.4 Add tests verifying undo restoration and rollback behavior

## 8. Actionable Alerts & Header Plan-Check

- [x] 8.1 Create `PlanCheckFlyout.tsx` component anchored to `[ 🔔 Plan-Check (X) ]` in the page header
- [x] 8.2 Render prioritized issue items with 1-click action buttons (e.g., "[ 🪄 Gericht vorschlagen ]" for empty slots)
- [x] 8.3 Connect 1-click action handlers to open Omnibar or trigger AI suggestion flows
- [x] 8.4 Add component tests for alert detection and flyout action triggers

## 9. Slim Plan Creation Modal

- [x] 9.1 Refactor `CreateMealPlanDialog.tsx` to require only Name, Start/End Date, and Personenzahl
- [x] 9.2 Automatically apply smart defaults for budget, reserve factor, and default meal times
- [x] 9.3 Redirect user directly to the new plan populated with empty standard slots
- [x] 9.4 Verify plan creation flow with end-to-end test

## 10. Quality Assurance & Standards Verification

- [x] 10.1 Run backend tests (`uv run pytest`) and fix any regressions
- [x] 10.2 Run frontend type-check (`npm run typecheck` or `tsc`) and linter
- [x] 10.3 Perform manual/e2e smoke test verifying the entire workflow from plan creation to cooking view
