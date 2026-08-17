## 1. Utility: getNextWeekend

- [x] 1.1 Create `frontend-food/src/lib/dateUtils.ts` with `getNextWeekend()` function that returns `{ friday: string, sunday: string }` in `YYYY-MM-DDTHH:MM` format
- [x] 1.2 Implement smart Friday logic: Mon–Wed → this Friday, Thu–Sun → next Friday; start 18:00, end next Sunday 14:00

## 2. Unified Create/Kopie Dialog

- [x] 2.1 Refactor the create dialog state: add `useCopySource` state (selected plan | null), `useCopyEnabled` (boolean checkbox)
- [x] 2.2 Add "Von Plan kopieren" checkbox with conditional source plan dropdown (reuse `mealPlans` data, filter out current plans if needed)
- [x] 2.3 Add "Vorlage"-Badge component that shows when a source is selected (name + meals_count)
- [x] 2.4 Implement pre-fill logic when source is selected: update `end_datetime` to `start + (source.end - source.start)`, update `norm_portions` to `source.norm_portions`
- [x] 2.5 Set defaults on dialog open: name = "Neuer Essensplan", dates = `getNextWeekend()`, portions = 10
- [x] 2.6 Wire submit to call `createMutation` (no source) or `duplicateMutation` (with source), applying " (Kopie)" suffix for copies
- [x] 2.7 Open dialog with source pre-selected when triggered from card dropdown "Als Vorlage verwenden"

## 3. Remove Old Duplicate Dialog

- [x] 3.1 Remove the separate duplicate dialog JSX block and its state variables
- [x] 3.2 Remove duplicate state variables (`duplicateSourceId`, `duplicateName`, `duplicateStart`, `duplicatePortions`)
- [x] 3.3 Update dropdown "Als Vorlage verwenden" action to open create dialog with `copyEnabled=true` and `copySourceId` set
- [x] 3.4 Clean up unused imports (if any)

## 4. Verify

- [x] 4.1 Test create with defaults: empty plan, Fri–Sun dates, 10 portions, default meals generated
- [x] 4.2 Test create with source: name gets " (Kopie)" suffix, meals deep-copied with date offset
- [x] 4.3 Test "Als Vorlage verwenden" from dropdown: dialog opens with source pre-selected
- [x] 4.4 Test validation: name empty prevents submit
- [x] 4.5 Test mobile layout: dialog is responsive at 320px width
