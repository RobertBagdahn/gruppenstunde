## Context

Der Frühstückassistent ist heute statisch mit hardcoded Extras und nicht-interaktiven Items. Gruppen können keine eigenen Zutaten/Rezepte anlegen. Das System hat bereits:
- Ingredient & Recipe Modelle mit Tagging via `Tag` M2M
- Permission/Sharing Pattern via `ContentCollaborator`
- Breakfast-Catalog API mit tag-basierten Filterung
- Create/Edit Flows für beide Modelle

Die Herausforderung: Konsistent Interaktivität, Tagging und Group-Visibility überall in den Wizard integrieren.

## Goals / Non-Goals

**Goals:**
- Zutaten/Rezepte im Wizard clickable (öffnen Detail-Seite in neuem Tab)
- "+ Create"-Buttons in jedem Wizard-Step mit Modal-Dialog
- Nutzer können eigene Zutaten/Rezepte anlegen (privat pro Gruppe, sharable)
- Tags überall editierbar in Create/Edit-Flows
- Extras tag-basiert statt hardcoded (neue breakfast-extra Tag)
- Breakfast-Catalog zeigt nur sichtbare Items (System + User's Items + geteilte Items)

**Non-Goals:**
- Real-time Sync wenn andere Nutzer Items ändern (später: WebSocket)
- AI Auto-Befüllung von Nährwerten für User-Items (später: optional)
- Batch-Operations (Mehrere Items gleichzeitig taggen)
- Mobile-Specific UX (aber mobile-first responsive)

## Decisions

### 1. **Create Dialogs vs Full Pages**
- **Decision**: Modal-Dialog im Wizard, nicht volle Create-Seite öffnen
- **Rationale**: Schneller Workflow, User bleibt im Wizard, kann sofort neue Item wählen
- **Alternative Rejected**: Vollständige Create-Seite (zu viel Context-Switching)

### 2. **Visibility Model: Group-Scoped Privacy**
- **Decision**: User-Items sind privat pro MealPlan/Group, können aber mit anderen Groups geteilt werden
- **Rationale**: Einfach zu verstehen (privat = nur diese Gruppe), flexibel (sharing)
- **Schema**: 
  - `visibility` Feld (private | shared)
  - `shared_group_ids` M2M für geteilte Gruppen
- **Alternative Rejected**: Public/Private (zu einfach), Role-Based (zu komplex)

### 3. **Breakfast Extras: Tag-Based vs Hardcoded**
- **Decision**: Neue `breakfast-extra` Tag, Extras aus Ingredients laden
- **Rationale**: Nutzer können eigene Extras hinzufügen, zentrale Verwaltung, reuses Ingredient-Model
- **Schema**: `GET /api/supply/breakfast-catalog/` returnt auch `extra_ingredients`
- **Alternative Rejected**: Hardcoded List (unflexibel), eigenständiges Extras-Model (redundant)

### 4. **Tag Management: Everywhere vs Detail-Only**
- **Decision**: Tag-Selector in Create/Edit-Flows überall (Dialog + Detail-Seite)
- **Rationale**: Kontextabhängig taggen (z.B. "Das ist Frühstück-Basis" beim Create)
- **Schema**: Tag-Selector-Komponente (wiederverwendbar), mit Kategorien (breakfast-*, nutritional-*)
- **Alternative Rejected**: Only on Detail-Page (zu viel Klicks)

### 5. **Permission Checks: Breakfast-Catalog Filtering**
- **Decision**: Backend filtert Catalog nach User-Permissions
- **Rationale**: Einfach, sicher (User sieht nie unvermeidlich Items)
- **Schema**: 
  ```
  GET /api/supply/breakfast-catalog/?group_id=X
  → System-Items (status=approved) + User's Items + Items geteilte mit Gruppe
  ```
- **Alternative Rejected**: Frontend-Filtering (unsicher, offline-Problem)

### 6. **Nährwerte für User-Items**
- **Decision**: Optional manuell eingeben (MVP), später: AI Befüllung
- **Rationale**: Schneller MVP, User kann aber Nährwerte vergeben wenn gewünscht
- **Alternative Rejected**: Mandatory (User-Friction), Always AI (zu komplex für MVP)

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Modal Dialog könnte UX überlasten** → Nutzer vergessen Wizard-State | Clear "Abbrechen" Button, State bleibt erhalten, Toast nach Create |
| **Tags-Spam** → User erstellen viele falsche Frühstück-Tags | Admin-Dashboard zum Cleanup, Tag-Vorschläge (Autocomplete) |
| **Share-Komplexität** → User verstehen Visibility nicht | Clear UI Labels ("Nur diese Gruppe", "Mit anderen teilen") + Help-Text |
| **Backward-Compat** → Alte Hardcoded Extras brechen | Migration-Script: Extras → Ingredients mit breakfast-extra Tag (einmalig) |
| **Performance**: viele User-Items im Catalog → Filter-Overhead | Index auf visibility+group_ids, Caching pro Group |

## Data Model Changes

**Ingredient Model** (supply/models/ingredient.py):
```python
class Ingredient(models.Model):
    # existing fields...
    visibility = CharField(choices=['private', 'shared'], default='private')  # NEW
    shared_groups = ManyToManyField(Group)  # NEW
```

**Recipe Model** (recipe/models/recipe.py):
```python
# Erbt von Content, das bereits owner/visibility hat
# Nur: sicherstellen dass visibility-Check konsistent ist
```

**Breakfast-Extras Migration** (backend/supply/migrations/):
```python
# Create Ingredient entries für hardcoded Extras:
# - Marmelade, Honig, Nutella, Zucker, etc
# - Tag mit breakfast-extra
# - owner=None (System-Items)
```

## API Changes

**Create/Update Endpoints** (backend/supply/api/ingredients.py, backend/recipe/api/recipes.py):
```python
POST /api/supplies/ingredients/
{
  "name": "Glutenfreies Vollkornbrot",
  "description": "...",
  "nutritional_values": {...},
  "tags_ids": [breakfast-base_id, gluten-free_id],
  "visibility": "private",  # NEW
  "shared_group_ids": []    # NEW
}

PATCH /api/supplies/ingredients/{slug}/
# Same schema
```

**Breakfast-Catalog Endpoint** (backend/supply/api/breakfast_catalog.py):
```python
GET /api/supply/breakfast-catalog/?group_id=X&include_shared=true
# Response: 
{
  "base_ingredients": [...],
  "topping_ingredients": [...],
  "fat_ingredients": [...],
  "drink_ingredients": [...],
  "drink_recipes": [...],
  "warm_meal_recipes": [...],
  "extra_ingredients": [...]  # NEW
}

# Permission Checks:
# - System-Items (owner=null, status=approved): always shown
# - User's Items (owner=user): only if user is owner
# - Shared Items: only if group matches shared_groups
```

## Frontend Architecture

**Components** (src/pages/planning/breakfast/):
- `CreateItemModal.tsx` — Reusable Modal für Ingredient/Recipe Create
- `TagSelector.tsx` — Tag-Checkbox-Liste mit Kategorien
- `VisibilitySelector.tsx` — Dropdown: private / shared (+ Group-Multiselect)
- Existing: `StepBasis.tsx`, `StepStreichfett.tsx`, etc — Add Create Buttons

**Wizard State** (src/pages/planning/breakfast/useWizardState.ts):
- Add: `showCreateModal`, `createModalType`, `createItemName` (form state)
- Callbacks: `openCreateModal()`, `closeCreateModal()`, `submitCreate()`
- After Create: Refresh Catalog Query, neue Item sichtbar in Liste

**API Client** (src/api/breakfast.ts):
- Add: `createIngredient()`, `createRecipe()` (POST to new endpoints)
- Update: `useBreakfastCatalog()` (include extra_ingredients)

## Deployment Plan

1. **Backend Migrations** (Django Migrations):
   - Add visibility/shared_groups fields to Ingredient
   - Recipe: ensure visibility handling (inherited from Content)
   - Create breakfast-extra Tag in Tag table
   - Seed: create Ingredient entries für Extras (migration)

2. **Backend API**:
   - Update endpoints für Create/Update (visibility handling)
   - Update breakfast_catalog für permission checks
   - Add tests für visibility/sharing

3. **Frontend**:
   - Add CreateItemModal, TagSelector, VisibilitySelector Komponenten
   - Update Wizard Steps (+ Buttons)
   - Update useWizardState (Create-Logic)
   - Update API Client

4. **Testing**:
   - Unit: Permission-Checks, Visibility-Filters
   - E2E: Create Item im Wizard, wählen, speichern

5. **Rollback**:
   - If visibility fields cause issues: Backfill `visibility=private` für alle existing Items
   - If Extras fail: Revert migrations, keep hardcoded Extras in StepExtras.tsx

## Open Questions

- Sollten geteilte Items im Catalog mit Badge/Icon gekennzeichnet sein? (z.B. "👥 Geteilt")
- Sollte User beim Create einen "Namen des Creator" sehen? (z.B. "von Robert")
- Sollen Admins/Owners Nutzer-Items editieren können? (ja/nein/shared-only)
