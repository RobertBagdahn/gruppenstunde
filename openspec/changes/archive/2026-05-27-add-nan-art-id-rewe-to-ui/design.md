## Context

Das `Ingredient`-Model hat bereits das Feld `nan_art_id_rewe` (BigIntegerField, nullable). Es wird beim Legacy-Import befüllt, ist aber nicht über die API oder das Frontend zugänglich.

Betroffene Dateien:
- `backend/supply/schemas/` — Pydantic IngredientOut/IngredientIn
- `frontend/src/pages/supplies/IngredientDetailPage.tsx`
- `frontend/src/pages/supplies/IngredientCreatePage.tsx` (falls vorhanden)
- `frontend-food/src/pages/supplies/IngredientDetailPage.tsx`
- `frontend-food/src/pages/ingredients/IngredientCreatePage.tsx`
- Frontend Zod-Schema für Ingredient

## Goals / Non-Goals

**Goals:**
- `nan_art_id_rewe` über API lesen und schreiben
- Im Referenzen-Block der Detail-Seite anzeigen (Label: "REWE Artikelnr.")
- Im Create/Edit-Formular editierbar machen

**Non-Goals:**
- Keine Validierung gegen REWE-API
- Kein Link zu REWE-Produktseite
- Keine Migration nötig

## Decisions

1. **Feld-Name im Schema**: `nan_art_id_rewe` — 1:1 zum Model-Feld, kein Rename.
2. **Typ**: `number | null` (Zod) / `int | None` (Pydantic) — analog zu `fdc_id`.
3. **UI-Label**: "REWE Artikelnr." — kurz, deutsch, verständlich.
4. **Platzierung**: Direkt nach FDC ID im Referenzen-Block.

## Risks / Trade-offs

- [Doppelte Frontends] `frontend/` und `frontend-food/` haben beide die gleiche Seite → beide anpassen. Risiko: Divergenz. Mitigation: Gleiche Änderung in beiden.
