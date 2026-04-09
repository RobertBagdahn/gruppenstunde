## Context

The frontend codebase is already fully TypeScript (`frontend/src/` contains only `.ts`/`.tsx` files). However, three legacy `.js` artifacts remain in the `frontend/` root directory:

1. `frontend/vite.config.js` — an exact duplicate of the existing `frontend/vite.config.ts`
2. `frontend/vite.config.d.ts` — a generated type declaration for the `.js` variant
3. `frontend/postcss.config.js` — the only config file still using JavaScript

These files contradict the project's TypeScript-everywhere convention and could cause tooling confusion (Vite may resolve the `.js` config instead of the `.ts` one depending on resolution order).

**Affected files (with paths):**
- `frontend/vite.config.js` (delete)
- `frontend/vite.config.d.ts` (delete)
- `frontend/postcss.config.js` (convert to `frontend/postcss.config.ts`)

**No API endpoint changes.** No database migrations required.

## Goals / Non-Goals

**Goals:**
- Remove duplicate `vite.config.js` and its `.d.ts` file
- Convert `postcss.config.js` to `postcss.config.ts` with proper type annotation
- Ensure the build (`vite build`) and dev server (`vite dev`) work correctly after changes

**Non-Goals:**
- Converting any backend Python files (not applicable)
- Adding new ESLint rules to prevent `.js` files (can be done separately)
- Changing any application source code (already TypeScript)

## Decisions

### 1. Delete `vite.config.js` rather than keeping it

**Decision**: Delete the `.js` file since `vite.config.ts` already exists with identical content.

**Rationale**: Vite resolves config files in order: `vite.config.js` > `vite.config.mjs` > `vite.config.ts` > etc. Having both means the `.js` version takes precedence, making the `.ts` version effectively dead code. Deleting `.js` lets the `.ts` version be used.

**Alternative**: Keep `.js` and delete `.ts` — rejected because the project convention is TypeScript.

### 2. Delete `vite.config.d.ts`

**Decision**: Remove the declaration file alongside `vite.config.js`.

**Rationale**: This file was generated for the `.js` variant. With `vite.config.ts`, TypeScript infers types directly — no `.d.ts` needed.

### 3. Convert `postcss.config.js` to `.ts` using `postcss-load-config` types

**Decision**: Rename to `postcss.config.ts` and add a `Config` type import.

**Rationale**: PostCSS supports `.ts` configs via `postcss-load-config` (which Vite uses internally). Using `.ts` provides type checking and aligns with the TypeScript-everywhere convention.

**Alternative**: Keep as `.js` since it's a simple config — rejected because the user explicitly wants all `.js` removed.

## Risks / Trade-offs

- **[Low] PostCSS `.ts` config resolution** — Vite uses `postcss-load-config` which supports `.ts` configs natively. No risk if using Vite 5+.
  - Mitigation: Verify `vite build` succeeds after conversion.

- **[Low] Vite config resolution order change** — After deleting `vite.config.js`, Vite will resolve `vite.config.ts` instead. Since they have identical content, no behavioral change.
  - Mitigation: Run `vite dev` and `vite build` to verify.
