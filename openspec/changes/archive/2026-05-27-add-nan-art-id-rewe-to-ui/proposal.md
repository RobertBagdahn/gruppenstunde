## Why

Das Feld `nan_art_id_rewe` (REWE Artikelnummer) existiert bereits im Backend-Model `Ingredient`, wird aber weder über die API exponiert noch im Frontend angezeigt. Nutzer können die REWE-Artikelnummer nicht sehen oder bearbeiten.

## What Changes

- Pydantic-Schema `IngredientOut` um `nan_art_id_rewe` erweitern
- Zod-Schema im Frontend um `nan_art_id_rewe` erweitern
- `IngredientDetailPage.tsx` — Anzeige im Referenzen-Block (neben FDC ID und EAN)
- `IngredientCreatePage.tsx` — Eingabefeld im Referenzen-Formular

## Capabilities

### New Capabilities

(keine)

### Modified Capabilities

- `ingredient-database`: REWE Artikelnummer (`nan_art_id_rewe`) wird über API exponiert und im UI angezeigt/editierbar

## Impact

- **Backend**: `supply` App — Pydantic-Schemas anpassen (`IngredientOut`, ggf. `IngredientIn`)
- **Frontend**: Zod-Schema für Ingredient, `IngredientDetailPage.tsx`, `IngredientCreatePage.tsx` (in `frontend/` und `frontend-food/`)
- **Migration**: Nicht nötig (Feld existiert bereits im Model)
- **API**: GET/POST/PATCH `/api/supply/ingredients/` gibt `nan_art_id_rewe` zurück/akzeptiert es
