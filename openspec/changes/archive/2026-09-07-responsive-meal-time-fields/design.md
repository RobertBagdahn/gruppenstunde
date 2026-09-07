## Context

The meal-plan wizard and the settings panel both render four meal groups using a four-column grid from the `sm` breakpoint onward. Each group places two native `type="time"` inputs side by side. On narrow containers, the browser-native controls cannot shrink enough, so values are clipped and the parent layout overflows.

Affected files are `frontend-food/src/pages/planning/wizard/ExtendedSettingsSection.tsx` and `frontend-food/src/pages/planning/SettingsPanel.tsx`. The current state and persistence shape remain valid.

## Goals / Non-Goals

**Goals:**

- Make all standard meal-time values readable from the 320px mobile baseline upward.
- Use one, two, and four meal groups per row at mobile, tablet, and desktop widths respectively.
- Keep the start/end fields adjacent within each meal group.
- Apply identical layout behavior in the wizard and existing-plan settings.

**Non-Goals:**

- No changes to time parsing, timezone handling, defaults, API requests, or persistence.
- No backend, Pydantic, Zod, database, or migration changes.
- No horizontal scrolling as a fallback layout.

## Decisions

- Use a mobile-first Tailwind grid with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; this directly expresses the agreed layout and preserves four columns only when enough width is available.
- Add `min-w-0` to grid items and ensure the time-input row can shrink within its grid cell. This addresses the native input minimum-width behavior rather than hiding overflow.
- Keep the time inputs in a `flex` row and let both inputs use the available width. Stacking the fields would improve width but contradicts the agreed adjacent start/end interaction.
- Apply the same class-level change in both components instead of introducing a new abstraction; the two sections have similar markup but distinct state and save behavior.
- Verify at 320px, a tablet-width viewport, and a desktop-width viewport. There are no API endpoint changes, schema changes, or migrations.

## Risks / Trade-offs

- [Native browser differences] Time-input chrome varies between browsers. `min-w-0`, full-width flex children, and breakpoint-aware grids reduce clipping risk, but browser checks remain useful.
- [Very narrow device widths] At the 320px baseline, controls may remain visually compact. Keeping one meal per row gives each pair the maximum available width without introducing scrolling.

## Migration Plan

No migration is required. Deploy as a frontend-only change. Rollback consists of reverting the two component class changes.

## Open Questions

None. The responsive breakpoints and field arrangement were confirmed during exploration.
