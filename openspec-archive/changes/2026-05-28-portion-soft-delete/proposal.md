## Why

Beim Löschen einer Portion, die bereits in Rezepten (RecipeItems) verwendet wird, gibt die API einen 409 Conflict zurück. Benutzer können diese Portionen nicht entfernen, obwohl sie im Ingredient-Admin nicht mehr sichtbar sein sollen. Ein Soft-Delete ermöglicht das "Löschen" ohne Datenverlust in bestehenden Rezepten.

## What Changes

- `Portion`-Model erhält ein `deleted_at`-Feld (analog zum bestehenden `Content.deleted_at`-Pattern)
- `delete_portion` API-Endpunkt setzt `deleted_at` statt hartem Delete oder 409-Fehler
- `list_portions` filtert gelöschte Portionen heraus (nur aktive werden angezeigt)
- RecipeItems behalten ihre Portion-FK-Referenz — bestehende Rezepte bleiben intakt
- Frontend: Kein 409-Fehler mehr beim Löschen, gelöschte Portionen erscheinen nicht in Auswahllisten

## Capabilities

### New Capabilities

- `portion-soft-delete`: Soft-Delete-Mechanismus für Portionen mit `deleted_at`-Feld, gefiltertem Listing und unverändertem Verhalten für bestehende Rezept-Referenzen.

### Modified Capabilities

## Impact

- **Backend App**: `supply` (Model `Portion`, API `ingredients.py`, Schema `PortionOut`)
- **Migration**: Neues `deleted_at`-Feld auf `supply.Portion`
- **Pydantic Schema**: Keine Änderung an `PortionOut` nötig (gelöschte werden einfach nicht gelistet)
- **Zod Schema**: Keine Änderung nötig
- **API-Endpunkte**: `DELETE /{slug}/portions/{portion_id}/` — Verhalten ändert sich von 409 zu 204
- **RecipeItem-Queries**: Stellen, die Portionen für Auswahllisten laden, müssen `deleted_at__isnull=True` filtern
