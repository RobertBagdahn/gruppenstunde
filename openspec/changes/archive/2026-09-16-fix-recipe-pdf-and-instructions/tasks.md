## 1. PDF Backend

- [x] 1.1 Extend the recipe PDF endpoint schema with validated `servings=1..100` and preserve the stored normportion invariant.
- [x] 1.2 Build a request-scoped export view model that scales RecipeItems, direct gram items, named portions, notes and nutrition values.
- [x] 1.3 Resolve structured RecipeSteps, placeholders, step ingredients, sections and durations using the requested serving scale.
- [x] 1.4 Keep Markdown description as a fallback for recipes without structured steps and render description separately.
- [x] 1.5 Fix PDF Context/template mismatches, preparation metadata, page format handling and allergen/metadata rendering.
- [x] 1.6 Add backend PDF tests for four-serving quantities, structured steps, fallback Markdown, direct items, placeholders and nutrition values.

## 2. Other Instruction Consumers

- [x] 2.1 Update cooking-schedule service and PDF to prefer structured steps with Markdown fallback.
- [x] 2.2 Update recipe detail API/frontend to show structured steps to read-only users.
- [x] 2.3 Rename free text to `Beschreibung` and structured content to `Zubereitungsschritte` in edit and detail UIs.
- [x] 2.4 Add tests for read-only rendering and consistent step fallback across recipe detail, cooking mode and exports.

## 3. Food Frontend PDF Flow

- [x] 3.1 Add a 1–100 servings control to `PdfExportDialog` for recipe exports.
- [x] 3.2 Pass the selected serving count through the PDF URL and show clear German explanatory text.
- [x] 3.3 Update recipe schemas/components and ensure meal-plan PDF options remain unaffected.
- [x] 3.4 Add frontend tests for dialog validation, URL construction and labels.

## 4. Verification

- [x] 4.1 Run targeted recipe/planner PDF and structured-step tests.
- [x] 4.2 Run frontend typecheck, lint and recipe workflow tests.
- [x] 4.3 Run the full backend contract/schema checks and inspect generated PDF text for representative recipes.
