## Why

The project convention requires TypeScript everywhere (`strict` mode, no `any`), but three leftover `.js`/`.d.ts` files remain in `frontend/`: a duplicate `vite.config.js` (identical to the existing `vite.config.ts`), its generated `vite.config.d.ts`, and `postcss.config.js`. Removing the duplicates and converting the PostCSS config to TypeScript eliminates inconsistency and enforces the "TypeScript only" rule across the entire frontend.

## What Changes

- **Delete** `frontend/vite.config.js` — exact duplicate of `frontend/vite.config.ts`
- **Delete** `frontend/vite.config.d.ts` — generated declaration file for the `.js` variant, no longer needed
- **Convert** `frontend/postcss.config.js` to `frontend/postcss.config.ts` with proper typing
- **Verify** no other `.js` source files exist (all `frontend/src/` files are already `.ts`/`.tsx`)

## Capabilities

### New Capabilities

_None — this is a cleanup change, not a new feature._

### Modified Capabilities

_None — no spec-level behavior changes._

## Impact

- **Affected files**: `frontend/vite.config.js`, `frontend/vite.config.d.ts`, `frontend/postcss.config.js`
- **No Django apps affected** — purely frontend tooling config
- **No Pydantic or Zod schemas affected**
- **No migrations required**
- **No API changes**
- **Build tooling**: Vite and PostCSS must continue to resolve their configs correctly after the changes
