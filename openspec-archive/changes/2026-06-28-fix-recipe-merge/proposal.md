## Why

Bug #26: Der Rezept-Merge in der Datenqualität ist nicht implementiert, obwohl Task 6.8 im Data-Quality-Offensive Change als erledigt markiert wurde. Die Frontend-Komponente `DuplicateDetectionList` ruft bei `type="recipe"` fälschlich die Ingredient-API-Endpunkte auf, die Rezepte nicht korrekt verarbeiten können. Dadurch ist der "Zusammenführen"-Button für Rezepte faktisch defekt.

## What Changes

- **Backend**: `duplicate_merged` zu `LinkType.choices` hinzufügen
- **Backend**: `GET /api/admin/data-quality/recipes/merge/preview/` Endpunkt erstellen (zeigt Source→Target + Referenzanzahl)
- **Backend**: `POST /api/admin/data-quality/recipes/merge/` Endpunkt implementieren (soft-delete + ContentLink)
- **Backend**: `POST /api/admin/data-quality/recipes/duplicates/dismiss/` Endpunkt erstellen
- **Backend**: `DELETE /api/admin/data-quality/recipes/duplicates/dismiss/` Endpunkt erstellen
- **Backend**: `recipe_duplicates()` um Dismissal-Filter ergänzen
- **Backend**: Pydantic-Schemas für Recipe-Merge-Preview erstellen (schlanker als Ingredient-Variante)
- **Frontend**: Recipe-spezifische Hooks (`useRecipeMergePreview`, `useRecipeMerge`, `useRecipeDismissDuplicate`, `useRecipeUndismissDuplicate`) in `dataQuality.ts`
- **Frontend**: `DuplicateDetectionList.tsx` korrekt an recipe-Endpunkte routen
- **Frontend**: `MergePreviewSchema` um recipe-kompatible Felder ergänzen (optional)
- **Task-Korrektur**: Task 6.8 im archivierten Change als offen markieren
- **Tests**: API-Tests für alle neuen Endpunkte

## Capabilities

### New Capabilities
- *(none — alle Änderungen betreffen existierende Capabilities)*

### Modified Capabilities
- `recipe`: Merge-Szenario erweitern um Preview-, Dismiss- und `duplicate_merged`-LinkType-Requirement
- `data-quality-dashboard`: UI-Szenario für Rezept-Merge-Dialog ergänzen

## Impact

- **Backend**: `backend/content/choices.py` — LinkType erweitern
- **Backend**: `backend/content/api/data_quality.py` — 4 neue Endpunkte + Dismissal-Filter
- **Backend**: `backend/content/schemas/data_quality.py` — RecipeMergePreviewOut Schema
- **Frontend**: `frontend-food/src/api/dataQuality.ts` — 4 neue Hooks
- **Frontend**: `frontend-food/src/schemas/dataQuality.ts` — MergePreviewSchema erweitern
- **Frontend**: `frontend-food/src/components/data-quality/DuplicateDetectionList.tsx` — Routing-Fix
- **OpenSpec**: `openspec/specs/recipe/spec.md` — Merge-Szenario erweitern
- **OpenSpec**: `openspec/specs/data-quality-dashboard/spec.md` — UI-Szenario ergänzen
- **OpenSpec**: `openspec/changes/archive/2026-06-07-data-quality-offensive/tasks.md` — Task 6.8 korrigieren
