## 1. Autocomplete Layout

- [x] 1.1 Refactor `IngredientAutocomplete` so the input and detail-search sibling occupy a fixed 44px row while pills/results render below.
- [x] 1.2 Constrain the ghost-text layer to the input row and preserve the existing icon, placeholder, and suggestion alignment.
- [x] 1.3 Keep horizontal pill scrolling within the pills area without changing the input row height.

## 2. Interaction Behavior

- [x] 2.1 Preserve query text and input focus when selecting a retail-section pill.
- [x] 2.2 Keep pills and results open while interacting with the autocomplete, and close them on genuine input blur.
- [x] 2.3 Add mobile touch-focus scrolling with approximately 16px viewport offset using normal page scrolling.

## 3. Verification

- [x] 3.1 Add or extend Playwright coverage at the configured 375px mobile viewport for initial, focused, and typed bounding boxes.
- [x] 3.2 Verify category selection preserves the query and focus and updates the filtered result request.
- [x] 3.3 Verify blur hides pills/results and run the existing recipe ingredient editing Playwright test.
- [x] 3.4 Run frontend typecheck/lint and relevant unit tests; confirm no backend or schema changes are needed.
