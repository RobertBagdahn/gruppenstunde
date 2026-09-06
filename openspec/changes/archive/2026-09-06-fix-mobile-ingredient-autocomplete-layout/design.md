## Context

`IngredientAutocomplete` is rendered beside the detail-search button in `InlineIngredientEditor`. Its category pills are conditionally rendered inside the same flex item as the input. When pills appear, the flex item grows from 44px to 80px; the absolute ghost-text layer uses `inset-0` and therefore also spans the pills, while the sibling button is vertically centered against the expanded row. Playwright measured this on a 375px viewport: the wrapper grew to 80px, the ghost layer grew to 80px, and the detail-search button moved relative to the input.

## Goals / Non-Goals

**Goals:**

- Keep the input row geometrically stable while suggestions and category pills are open.
- Keep pills directly below the input and results below the pills.
- Preserve focus and query text after category selection.
- Hide the open-state controls on blur.
- Provide mobile-only focus scrolling without changing backend behavior.

**Non-Goals:**

- No changes to ingredient search APIs, query parameters, debounce timing, or result ranking.
- No changes to recipe item creation, portion selection, or detail-search behavior.
- No database migration or schema changes.

## Decisions

- **Separate the input row from the expanded autocomplete content.** Keep the input and detail-search button in a 44px `items-start`/fixed-height row, and render pills/results in a block below it. This avoids relying on flex centering while the autocomplete content changes height.
- **Constrain the ghost layer to the input row.** The ghost layer will be positioned relative to a 44px input wrapper rather than the full autocomplete component, so its icon and text remain aligned with the input.
- **Keep focus on category selection.** Category controls will use mouse/pointer handling that prevents the input blur from closing the component before the selection is applied, then explicitly refocus the input. The current query remains unchanged and the selected category updates the existing TanStack Query key.
- **Use `scrollIntoView` for mobile focus.** On touch/mobile focus, scroll the input into view with a small top margin. The implementation will avoid introducing a visual-viewport dependency unless browser testing demonstrates that normal scrolling is insufficient.
- **Test through Playwright at 375px.** The test will record the input and adjacent button bounding boxes before and after typing, assert the fixed row height/alignment, and exercise category selection and blur behavior.

## Risks / Trade-offs

- **[Risk]** Preventing blur for category clicks can leave the dropdown open unexpectedly. **Mitigation:** explicitly close on genuine input blur and cover click-selection plus outside-click behavior in Playwright.
- **[Risk]** Mobile browser keyboard behavior differs between Chromium, Safari, and installed PWAs. **Mitigation:** use standard focus scrolling with a conservative offset and keep the behavior limited to touch/mobile contexts.
- **[Risk]** A narrow viewport may not fit all category pills. **Mitigation:** retain horizontal scrolling for the pills without allowing them to affect the input row height.

## Migration Plan

No data or deployment migration is required. Deploy the frontend changes normally; rollback is a frontend-only revert if the mobile interaction test or manual verification finds a regression.

## Open Questions

None. The interaction and layout behavior were confirmed during exploration.
