## 1. PortionScaler disabled prop

- [x] 1.1 `PortionScaler.tsx`: Add optional `disabled?: boolean` prop, apply `disabled` to +/- buttons and `readOnly` to input, add `opacity-50` when disabled
- [x] 1.2 `RecipeSidebar.tsx`: Accept `disabled` prop, pass through to `PortionScaler`
- [x] 1.3 `PortionBottomSheet.tsx`: Accept `disabled` prop, pass through to `PortionScaler`
- [x] 1.4 `RecipeDetailPage.tsx`: Pass `isInlineEditMode` as `disabled` to `RecipeSidebar` and `PortionBottomSheet`

## 2. Verification

- [x] 2.1 Run `npm run lint` in `frontend-food/` — no new issues
- [x] 2.2 Run `npm run build` in `frontend-food/` — no new type errors
- [x] 2.3 Manual test: Open edit mode → verify PortionScaler is disabled
- [x] 2.4 Manual test: Close edit mode → verify PortionScaler is interactive again
