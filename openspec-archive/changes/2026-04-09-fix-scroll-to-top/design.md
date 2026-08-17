## Context

The frontend uses React Router v6 (`react-router-dom ^6.27.0`) with a `<BrowserRouter>` wrapper in `frontend/src/main.tsx`. Routes are defined in `frontend/src/App.tsx` using `<Routes>` and `<Route>`, wrapped by a `<Layout>` component.

Currently, there is zero scroll management. The browser's default behavior retains the scroll position when navigating between routes, causing users to land mid-page on new routes.

**Affected files:**
- `frontend/src/main.tsx` -- BrowserRouter setup
- `frontend/src/App.tsx` -- Route definitions, Layout wrapper
- New: `frontend/src/components/ScrollToTop.tsx`

**No API endpoint changes.** No database migrations. No schema changes.

## Goals / Non-Goals

**Goals:**
- Reset scroll position to top on every route change (pathname change)
- Zero-config solution that works for all current and future routes

**Non-Goals:**
- Scroll restoration (remembering and restoring previous scroll positions when going back) -- can be added later
- Smooth scroll animation on route change -- instant jump is correct behavior
- Hash-based scrolling (anchor links within a page) -- existing `scrollIntoView` in BlogDetailPage handles this

## Decisions

### 1. `useEffect` + `useLocation` approach over `createBrowserRouter` migration

**Decision:** Create a small `ScrollToTop` component using `useEffect` + `useLocation().pathname` that calls `window.scrollTo(0, 0)`.

**Alternative considered:** Migrate to `createBrowserRouter` and use React Router's built-in `<ScrollRestoration>`. This was rejected because:
- It requires restructuring the entire router setup (moving from JSX routes to route objects)
- It's a much larger change for a simple bug fix
- The `useEffect` approach is well-established, minimal, and sufficient

### 2. Component placement inside `<BrowserRouter>`

**Decision:** Place `<ScrollToTop />` inside `<BrowserRouter>` in `main.tsx`, before `<App />`.

**Rationale:** The component needs access to React Router's context (`useLocation`), so it must be inside `<BrowserRouter>`. Placing it in `main.tsx` rather than `App.tsx` keeps it at the infrastructure level, separate from route logic.

### 3. Trigger on `pathname` only, not `search` or `hash`

**Decision:** Only trigger scroll-to-top when `location.pathname` changes.

**Rationale:** Changing query parameters (filters, pagination) or hash fragments should not reset scroll position. Users expect to stay at their current position when applying filters.

## Risks / Trade-offs

- **[Minimal risk]** Future pages may want to preserve scroll on certain navigations (e.g., tabbed views). Mitigation: Can be refined later with route-specific opt-out if needed.
- **[No risk]** No new dependencies added -- uses only React and React Router APIs already in the project.
