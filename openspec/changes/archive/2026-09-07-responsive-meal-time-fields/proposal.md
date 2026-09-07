## Why

The standard meal-time inputs in the meal-plan wizard and existing-plan settings are too narrow at mobile and tablet widths. Native time controls are clipped, making values such as `09:00` appear incomplete and forcing horizontal overflow. The settings need to remain readable without scrolling while preserving the compact four-column desktop layout.

## What Changes

- Make the standard meal-time controls responsive in the meal-plan creation wizard.
- Make the same responsive layout apply to settings for existing meal plans.
- Show one meal per row on small screens, two meals per row at medium widths, and four meals per row on large screens.
- Keep start and end time fields next to each other within each meal.
- Ensure the layout does not create horizontal scrolling or clip native time-input values.
- Keep the current meal types, values, labels, and persistence behavior unchanged.

## Capabilities

### New Capabilities

- `responsive-meal-time-fields`: Responsive, non-overflowing presentation of meal default start/end time fields.

### Modified Capabilities

- `meal-plan-time-editing`: Extend the settings presentation requirement so plan default-time controls remain usable across supported viewport widths.

## Impact

- Affected React components: `frontend-food/src/pages/planning/wizard/ExtendedSettingsSection.tsx` and `frontend-food/src/pages/planning/SettingsPanel.tsx`.
- No backend, Pydantic schema, Zod schema, API, database, or migration changes are expected.
- Frontend responsive layout tests or component verification should cover 320px/mobile, tablet, and desktop widths.
