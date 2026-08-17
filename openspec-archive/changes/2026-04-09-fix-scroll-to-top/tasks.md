## 1. Create ScrollToTop Component

- [x] 1.1 Create `frontend/src/components/ScrollToTop.tsx` component that uses `useEffect` + `useLocation().pathname` to call `window.scrollTo(0, 0)` on pathname changes

## 2. Integrate into Router

- [x] 2.1 Import and add `<ScrollToTop />` inside `<BrowserRouter>` in `frontend/src/main.tsx`, before `<App />`

## 3. Verify

- [x] 3.1 Run TypeScript build (`npm run build`) to confirm no type errors
- [x] 3.2 Manual verification: navigate between pages and confirm scroll resets to top
