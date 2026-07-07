## Why

Der RecipeSearchDialog (Rezept-/Zutatensuche im Essensplan) hat ein instabiles Layout: Bei jeder Sucheingabe und bei jeder Auswahl "zappeln" die Inhalte — Ergebnisse verschwinden kurz und kommen wieder, die Dialoggröße ändert sich, Sub-Dialoge blenden den Hauptdialog aus. Das fühlt sich nicht gut an und stört den Workflow.

## What Changes

- **Stabile Suchergebnisse**: Ergebnisse bleiben beim Tippen sichtbar (kein Flackern durch `keepPreviousData`)
- **Feste Dialoggröße**: Der Hauptdialog behält seine Größe, auch wenn Sub-Dialoge (IngredientQuantity, RecipePreview) geöffnet werden
- **Stabile Suchleiste**: Die Suchleiste bleibt immer an derselben Position, auch wenn Filter/Kategorien umgeschaltet werden
- **Sub-Dialoge ohne Hauptdialog-Unterbrechung**: IngredientQuantityDialog und RecipePreviewDialog öffnen sich als Overlay INNERHALB des Hauptdialogs, statt ihn zu verstecken
- **Kein Conditional Unmount**: DayPlanView und TableView rendern den Dialog nicht mehr konditional, sondern per `open`-Prop (wie MealSlot bereits)

## Capabilities

### New Capabilities
- `recipe-search-dialog-stability`: Stabilisierung des RecipeSearchDialog — Layout-Anker, Sub-Dialog-Integration, Daten-Preservation während Suchübergängen

### Modified Capabilities
- `meal-planner-recipe-search`: Das Verhalten des RecipeSearchDialog bei Sucheingabe und Auswahl wird geändert — kein Daten-Flackern mehr, stabile Layout-Dimensionen

## Impact

- **Frontend-Dateien**:
  - `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` — Hauptänderung: Query-Optionen, Dialog-Struktur, Layout
  - `frontend-food/src/pages/planning/RecipePreviewDialog.tsx` — Umbau zu Inline-Overlay (kein eigener Dialog)
  - `frontend-food/src/pages/planning/MealSlot.tsx` — Anpassung Dialog-Handling
  - `frontend-food/src/pages/planning/DayPlanView.tsx` — Dialog nicht mehr konditional rendern
  - `frontend-food/src/pages/planning/TableView.tsx` — Dialog nicht mehr konditional rendern
- **Keine Backend-Änderungen** (reine Frontend-UX-Verbesserung)
- **Keine Schema-Änderungen** (Pydantic/Zod bleiben unverändert)
