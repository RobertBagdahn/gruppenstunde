## Why

Der Frühstückassistent ist heute statisch: Zutaten/Rezepte sind nicht interaktiv, es gibt keinen Weg, eigene Zutaten/Rezepte zu erstellen, und Extras sind hardcoded statt tag-basiert. Das führt zu Friction bei der Nutzung und verhindert, dass Gruppen ihre eigenen Zutaten (z.B. glutenfreies Brot) verwalten können. Wir verbessern die UX durch Interaktivität, Customization und Tag-Management — direkt im Wizard.

## What Changes

- **Zutaten/Rezepte clickable** — Links öffnen Detail-Seiten in neuem Tab
- **Create Buttons in jedem Wizard-Step** — Modal zum schnellen Erstellen eigener Zutaten/Rezepte mit Tag-Selektion
- **Privat + Shareable** — Nutzer-Zutaten/Rezepte sind privat pro Gruppe, können aber mit anderen Gruppen geteilt werden
- **Tag-System überall** — Tag-Verwaltung in Create/Edit-Flows, nicht nur auf Detail-Seiten
- **Extras tag-basiert** — Extras (Marmelade, Honig, etc) sind jetzt tag-basiert statt hardcoded
- **Permission-Checks im Catalog** — Breakfast-Catalog zeigt nur Zutaten/Rezepte, die der User sehen darf

## Capabilities

### New Capabilities

- `breakfast-item-interactivity`: Zutaten/Rezepte im Wizard sind clickable und öffnen Detail-Seiten
- `breakfast-item-creation`: Create Buttons in jedem Wizard-Step mit Modal-Dialog zum Erstellen eigener Zutaten/Rezepte
- `breakfast-tag-management`: Tags sind überall editierbar (Create, Edit, Detail-Seiten)
- `breakfast-extras-tagging`: Extras sind tag-basiert (breakfast-extra Tag) statt hardcoded
- `ingredient-group-visibility`: Zutaten können privat pro Gruppe sein und mit anderen Gruppen geteilt werden

### Modified Capabilities

- `breakfast-catalog-api`: Liefert jetzt nur Zutaten/Rezepte, die der User/die Gruppe sehen darf (permission checks)

## Impact

**Backend**:
- `supply/models/ingredient.py` — Visibility/Group-Handling hinzufügen
- `supply/api/breakfast_catalog.py` — Permission Checks, sharable Zutaten-Filtern
- `recipe/models/recipe.py` — Visibility/Group-Handling
- `recipe/api/recipes.py` — Permission Checks erweitern
- Neue Endpoints für Visibility/Sharing

**Frontend-Food**:
- `src/pages/planning/breakfast/` — Create Buttons + Modals in jedem Step
- `src/pages/planning/breakfast/StepExtras.tsx` — Extras tag-basiert laden (nicht hardcoded)
- `src/api/breakfast.ts` — New Endpoints für Create/Visibility
- `src/schemas/breakfast.ts` — Tag-Schemas erweitern
- Tag-Selector-Komponente (wiederverwendbar)

**APIs**:
- `POST /api/supplies/ingredients/` — `visibility`, `shared_group_ids` Parameter
- `PATCH /api/supplies/ingredients/{slug}/` — Tag-Handling erweitern
- `GET /api/supply/breakfast-catalog/` — Permission-Checks, sharable Items
- Gleiches für Rezepte

**Permissions**:
- User können eigene Zutaten/Rezepte erstellen (status=draft, visibility=private)
- Owner kann mit Gruppen teilen → Collaborator-Modell erweitern
- Breakfast-Catalog zeigt nur: System-Items + User's Items + geteilte Items
