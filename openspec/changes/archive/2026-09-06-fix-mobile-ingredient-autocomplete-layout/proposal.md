## Why

On mobile recipe creation, typing into the manual ingredient autocomplete causes the input row and adjacent detail-search button to shift vertically. The category pills expand the autocomplete wrapper, while the ghost-text layer is positioned over the full expanded wrapper instead of the fixed input row, making text and controls appear misaligned.

## What Changes

- Keep the ingredient input and detail-search control in a fixed 44px row while category pills are shown.
- Render category pills directly below the input row and place the result list below the pills.
- Hide category pills when the autocomplete loses focus.
- Preserve the query and input focus when selecting a category pill so the filtered search updates in place.
- On mobile touch focus, scroll the normal page so the input is visible with approximately 16px space above the keyboard/viewport boundary.
- Add Playwright coverage for the mobile autocomplete geometry and interaction behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `recipe-creation-wizard`: The mobile Step 1 ingredient autocomplete interaction and layout requirements are refined.

## Impact

- Frontend: `frontend-food/src/components/recipe/IngredientAutocomplete.tsx` and its integration in `InlineIngredientEditor`.
- End-to-end tests: mobile Playwright coverage for the recipe creation ingredient editor.
- No backend API, Pydantic schema, Zod schema, database model, or migration changes are required.
