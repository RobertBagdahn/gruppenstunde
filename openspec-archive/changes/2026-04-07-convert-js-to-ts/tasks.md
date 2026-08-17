## 1. Remove duplicate Vite config files

- [x] 1.1 Delete `frontend/vite.config.js` (exact duplicate of `vite.config.ts`)
- [x] 1.2 Delete `frontend/vite.config.d.ts` (generated declaration for the `.js` variant)

## 2. Convert PostCSS config to TypeScript

- [x] 2.1 ~~Create `frontend/postcss.config.ts`~~ → Moved PostCSS config inline into `vite.config.ts` (`css.postcss`) to avoid `ts-node` dependency
- [x] 2.2 Delete `frontend/postcss.config.js`

## 3. Verification

- [x] 3.1 Run `npm run dev` in `frontend/` to verify dev server starts correctly
- [x] 3.2 Run `npm run build` in `frontend/` to verify production build succeeds
- [x] 3.3 Confirm no `.js` files remain in `frontend/` root (excluding `node_modules/`)
