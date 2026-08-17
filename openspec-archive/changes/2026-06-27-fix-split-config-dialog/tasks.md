## 1. Refactor SplitConfigDialog

- [x] 1.1 Extract `buildGroups` as module-level pure function with explicit `(recipeItems, effectivePortions)` parameters
- [x] 1.2 Add `useMemo` to compute `computedGroups` synchronously from `recipeItems` and `effectivePortions`
- [x] 1.3 Replace `hasBuiltOnce` ref with `dataLoaded = !isLoading && !isFetching` for render decisions
- [x] 1.4 Update render guards: use `computedGroups` for close decision, `dataLoaded` for loading spinner
- [x] 1.5 Use `displayGroups = groups.length > 0 ? groups : computedGroups` to prevent flash
- [x] 1.6 Remove unused `useRef` import

## 2. Verify

- [x] 2.1 Dialog stays open when adding a recipe with optional ingredients
- [x] 2.2 Dialog stays open when adding a recipe with exchange groups
- [x] 2.3 Dialog closes automatically for recipes without optional/exchange items
- [x] 2.4 Loading spinner shows while recipe items are being fetched
- [x] 2.5 Portion edits and save still work correctly
- [x] 2.6 TypeScript compiles without errors (`npx tsc --noEmit` in frontend-food/)
