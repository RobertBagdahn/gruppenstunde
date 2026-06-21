## Why

Der `PortionScaler` in der Sidebar bleibt während des Inline-Edit-Modus aktiv. Ändert der Nutzer die Portionen-Zahl während der Editor offen ist, re-normalisiert der Editor die Mengen nicht (useState-Initializer läuft nur beim Mount). Das führt zu inkonsistenten Anzeigen und falsch gespeicherten Mengen.

## What Changes

- **PortionScaler sperren**: Während `isInlineEditMode === true` wird der PortionScaler in `RecipeSidebar` (Desktop) und `PortionBottomSheet` (Mobile) deaktiviert — Buttons disabled, Input readonly.
- `RecipeDetailPage` gibt `isInlineEditMode` als Prop an beide Komponenten weiter.

## Capabilities

### New Capabilities

Keine — reine UX-Absicherung eines bestehenden Features.

### Modified Capabilities

- `recipe-portion-scaling-edit`: PortionScaler ist während des Edit-Modus gesperrt.

## Impact

- **Frontend Food**: `RecipeSidebar.tsx`, `PortionBottomSheet.tsx`, `RecipeDetailPage.tsx`
- **Backend**: Keine Änderungen
- **Keine Migrationen**, keine Schema-Änderungen
