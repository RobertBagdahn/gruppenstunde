## Why

Die Zutatenliste ist aktuell nur über direkte URL `/ingredients` erreichbar, aber nicht im Hauptmenü sichtbar. Nutzer können Zutaten nicht intuitiv finden. Zusätzlich fehlt ein `created_by`-Feld am Ingredient-Model, wodurch die Edit-Berechtigung nicht auf den Ersteller eingeschränkt werden kann – aktuell darf jeder eingeloggte User editieren.

## What Changes

- Neuer Menüeintrag "Zutaten" (Icon: `egg`) im "Inhalte"-Dropdown der Navigation
- `TOOL_INGREDIENTS`-Konstante in `toolColors.ts` analog zu den anderen Content-Tools
- `created_by` ForeignKey auf dem `Ingredient`-Model (nullable für bestehende Einträge)
- Backend: Update/Delete nur für Creator oder `is_staff`
- Frontend: Edit-Button nur anzeigen wenn User Creator oder Staff ist
- `created_by` im API-Response und Zod-Schema exposen

## Capabilities

### New Capabilities

- `ingredient-menu-entry`: Navigation-Eintrag für Zutaten im Inhalte-Dropdown mit TOOL-Konstante

### Modified Capabilities

- `ingredient-database`: Neues `created_by`-Feld und rollenbasierte Edit-Berechtigung (Creator oder is_staff)

## Impact

- **Backend**: `supply/models/ingredient.py` (neues Feld), `supply/api/ingredients.py` (Permission-Check), `supply/schemas/` (created_by im Response), neue Migration
- **Frontend**: `src/lib/toolColors.ts` (TOOL_INGREDIENTS), `src/components/Layout.tsx` (Menüeintrag), `src/pages/supplies/IngredientDetailPage.tsx` (canEdit-Logik), `src/schemas/supply.ts` (created_by-Feld)
- **Pydantic-Schema**: `IngredientOutSchema` um `created_by` erweitern
- **Zod-Schema**: `IngredientSchema` in `supply.ts` um `created_by` erweitern
- **Migration**: `supply/migrations/` – AddField created_by (nullable)
