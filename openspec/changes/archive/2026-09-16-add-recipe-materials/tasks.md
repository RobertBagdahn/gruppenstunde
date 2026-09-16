## 1. Backend Material Domain

- [x] 1.1 Add typed recipe material Pydantic schemas for list, create, update, reorder and AI suggestions.
- [x] 1.2 Implement recipe-scoped material list/create/update/delete/reorder endpoints over `ContentMaterialItem`.
- [x] 1.3 Add server-side recipe edit permissions, material ownership checks, duplicate handling and transaction boundaries.
- [x] 1.4 Implement separate recipe material AI suggestion and atomic apply services without persisting preview results.
- [x] 1.5 Add backend tests for authorized CRUD, unauthorized access, duplicates, ordering and AI apply/reject flows.

## 2. Contract Synchronization

- [x] 2.1 Update recipe detail/create/update Pydantic schemas with material data where required.
- [x] 2.2 Add matching Food frontend Zod schemas and API hooks with no TypeScript `any` types.
- [x] 2.3 Add contract tests covering empty, populated and legacy admin-created material records.

## 3. Food Frontend

- [x] 3.1 Build a reusable `RecipeMaterialsEditor` with add, quantity edit, reorder, delete and loading/error states.
- [x] 3.2 Add read-only materials to recipe detail and a separate editor section to `EditRecipePage` and the wizard.
- [x] 3.3 Add AI material suggestion dialog with matched/unmatched status and explicit confirmation.
- [x] 3.4 Keep ingredient and equipment UI sections separate and add German labels/toasts.
- [x] 3.5 Add responsive component and workflow tests from 320px upward.

## 4. Export And Verification

- [x] 4.1 Add materials to recipe PDF/export view models where the existing export contract requires them.
- [x] 4.2 Verify existing Equipment M2M behavior and admin inline data remain intact.
- [x] 4.3 Run backend migrations check, targeted tests, frontend typecheck/lint and contract tests.
