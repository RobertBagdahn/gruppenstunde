## Requirements

### Requirement: All frontend config files MUST use TypeScript

The frontend project SHALL NOT contain any `.js` source or config files. All configuration files (Vite, PostCSS, etc.) MUST use `.ts` extensions with proper type annotations.

#### Scenario: No .js files in frontend root
- **WHEN** listing files in `frontend/` (excluding `node_modules/`, `dist/`)
- **THEN** no files with `.js` extension SHALL exist

#### Scenario: PostCSS config is TypeScript
- **WHEN** Vite resolves the PostCSS configuration
- **THEN** it MUST load `postcss.config.ts` (not a `.js` variant)

#### Scenario: Vite config is TypeScript only
- **WHEN** Vite resolves its configuration file
- **THEN** it MUST load `vite.config.ts` with no duplicate `.js` or `.d.ts` variants present

### Requirement: Build and dev server MUST work after conversion

The frontend build pipeline SHALL continue to function correctly after removing `.js` config files.

#### Scenario: Development server starts successfully
- **WHEN** running `npm run dev` in the frontend directory
- **THEN** Vite dev server MUST start without config resolution errors

#### Scenario: Production build completes successfully
- **WHEN** running `npm run build` in the frontend directory
- **THEN** the build MUST complete without errors related to config resolution
