## Why

Die Zutatendetailseite (`/ingredients/{slug}`) zeigt Nährwerte, Portionen und Aliase — aber keine Packungen, keine Tags und keine Verifikationssteuerung. Alle drei Features sind im Backend bereits vorhanden (Modelle, Endpunkte, Hooks), werden aber nicht im UI angezeigt. Tags fehlen sogar komplett in der API-Response.

## What Changes

- **Packungen**: Neue UI-Sektion auf der Detailseite — Liste, Add/Edit/Delete, Drag&Drop-Reorder (analog Portionen). Backend und Frontend-Hooks sind bereits fertig.
- **Tags (content.Tag)**: `tags: list[TagOut]` zu `IngredientDetailOut` hinzufügen (Backend-Schema + Resolver + Prefetch). Zod-Schema synchronisieren. Tag-Badges + Add/Remove-UI im Frontend.
- **Verifikation**: "Inspi Verified"-Badge + Button zum Verifizieren (nur Staff). Backend validiert bereits `status="verified"` nur für Staff.

## Capabilities

### New Capabilities
- `ingredient-packages`: Packungen (Packages) auf der Zutatendetailseite anzeigen, erstellen, bearbeiten, löschen und per Drag&Drop sortieren
- `ingredient-tags`: Tags (content.Tag) in der Zutatendetail-API ausliefern und auf der Detailseite anzeigen, hinzufügen und entfernen
- `ingredient-verify`: Verifikationsstatus in der Detailseite anzeigen und durch Staff user setzen/entfernen

### Modified Capabilities
<!-- No existing specs modified — these are net-new UI/API features -->

## Impact

| Bereich | Datei | Änderung |
|---------|-------|----------|
| Backend Schema | `supply/schemas/ingredients.py` | `tags: list[TagOut]` + `resolve_tags` zu `IngredientDetailOut` |
| Backend API | `supply/api/ingredients.py` | `"tags"` zu `prefetch_related` in `get_ingredient` |
| Backend Schema | `content/schemas/base.py` | `TagOut` import (bereits vorhanden, wird referenziert) |
| Frontend Schema | `frontend-food/src/schemas/supply.ts` | `tags: z.array(TagSchema)` zum `IngredientDetailSchema` |
| Frontend Page | `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` | Packages-Sektion, Tags-Sektion, Verify-Badge/Button |
