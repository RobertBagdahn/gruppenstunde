## 1. Frontend: Layout cleanup

- [x] 1.1 Remove the Events entry from `toolsMenuItems` array in `frontend/src/components/Layout.tsx` so the desktop Tools dropdown no longer shows "Aktionen"
- [x] 1.2 Verify that the mobile more-menu Tools section (which renders from the same `toolsMenuItems`) automatically no longer shows "Aktionen" — no additional code change needed if the source array is the single truth
- [x] 1.3 Confirm the Events entry remains intact in: top-level desktop nav, mobile bottom-nav (`bottomNavItems`), and footer

## 2. Documentation

- [x] 2.1 Add a "Primary navigation single-location policy" section to `frontend/AGENTS.md` stating: each tool entry appears at most once in the primary navigation (top-level OR Tools dropdown/section, never both). Footer is exempt.
- [x] 2.2 Add a short code comment above the `toolsMenuItems` definition in `Layout.tsx` pointing to the policy in AGENTS.md

## 3. Verification

- [x] 3.1 Manual check at 320px, tablet, and desktop breakpoints that Events appears exactly at the expected locations and nowhere else in primary navigation
- [x] 3.2 Verify all navigation paths to `/events` still work (top-level desktop link, mobile bottom-nav, footer)
