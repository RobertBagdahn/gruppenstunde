## Why

Die Rezept-Detailseite und ihre Routen wurden versehentlich in Commit `485870d` entfernt. Admins können Rezeptdaten (Zutaten, Portionen, Texte) nicht mehr inline bearbeiten oder löschen. Der AI-Zauberstab für Mengen-Schätzung ist ebenfalls nicht erreichbar.

## What Changes

- **BREAKING**: Rezept-Routen (`/recipes`, `/recipes/:slug`, `/recipes/:slug/edit`, etc.) wiederherstellen in `App.tsx`
- Rezept-Page-Dateien aus Git-History wiederherstellen (`RecipeDetailPage.tsx`, `RecipeListPage.tsx`, etc.)
- Inline-Editing für Admins auf der Detail-Seite reaktivieren (Zutaten, Portionen, Texte)
- AI-Zauberstab (Mengen-Schätzung) wieder nutzbar machen
- Löschen von Zutaten und Rezepten wieder ermöglichen

## Capabilities

### New Capabilities

_(keine — alles existierte bereits)_

### Modified Capabilities

- `recipe-inline-edit`: Keine Requirement-Änderung, nur Wiederherstellung der Implementation

## Impact

- `frontend/src/App.tsx` — Routen wiederherstellen
- `frontend/src/pages/recipes/` — Seiten-Dateien aus Git-History wiederherstellen
- Abhängige Imports (ShoppingList, MealPlan Routen) müssen ggf. ebenfalls wiederhergestellt werden
