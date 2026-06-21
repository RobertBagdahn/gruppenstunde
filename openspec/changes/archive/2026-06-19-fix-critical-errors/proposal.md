## Why

Drei kritische Frontend-Bugs blockieren Kern-Workflows: Die SearchPage hat fehlende Importe (Compile-Error), der EntityType in entityUrls.ts kennt kein `'recipe'` (kaputte Links für Rezept-Suchergebnisse), und die CommandPalette navigiert auf falsche Routen (404).

## What Changes

- **SearchPage Import-Fix**: Fehlende Imports für `EntityLink`, `EntityLinkContext`, `EntityType` in `SearchPage.tsx` ergänzen
- **EntityType um `recipe` erweitern**: `EntityType` in `entityUrls.ts` um `'recipe'` erweitern mit Route `/recipes/:slug`, und `entityUrls.test.ts` korrigieren (Test beschreibt `recipe` testet aber `session`)
- **CommandPalette Routen korrigieren**: `/sessions/new` → `/create/session` und `/planner` → `/session-planner/app` in `CommandPalette.tsx`

## Capabilities

### New Capabilities

Keine — reine Bugfixes.

### Modified Capabilities

- `search`: SearchPage braucht korrekte Imports und EntityLink-Integration
- `entity-link`: EntityType muss `recipe` unterstützen
- `command-palette`: Quick-Action-Routen müssen mit App.tsx-Routen übereinstimmen

## Impact

- **Frontend**: `SearchPage.tsx` (Imports + EntityLink-Nutzung), `entityUrls.ts` + `entityUrls.test.ts` (recipe-Type), `CommandPalette.tsx` (Routen)
- **Backend**: Keine Änderungen
- **Keine Migrationen**, keine Schema-Änderungen