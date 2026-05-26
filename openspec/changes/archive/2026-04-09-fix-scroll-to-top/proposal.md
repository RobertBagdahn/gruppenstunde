## Why

When navigating between pages (e.g., scrolling down a list, then clicking a detail page), the browser retains the previous scroll position instead of scrolling to the top. This causes users to land mid-page or at the bottom of new pages, creating a confusing and broken navigation experience. This is a fundamental UX bug that affects every page transition in the application.

## What Changes

- Add a `ScrollToTop` component that resets scroll position to `(0, 0)` on every route change
- Integrate the component into the router setup in `main.tsx` or `App.tsx`
- No backend changes, no schema changes, no migrations required

## Capabilities

### New Capabilities

_None_ -- this is a bug fix, not a new capability requiring a spec.

### Modified Capabilities

_None_ -- no existing spec-level requirements are changing.

## Impact

- **Frontend only**: `frontend/src/main.tsx` or `frontend/src/App.tsx` and a new small component
- **No APIs affected**: Pure client-side fix
- **No Pydantic/Zod schemas affected**: No data model changes
- **No migrations required**
- **No dependencies added**: Uses built-in React Router hooks (`useLocation`) and browser API (`window.scrollTo`)
- **All pages benefit**: Every route transition will now correctly scroll to top
