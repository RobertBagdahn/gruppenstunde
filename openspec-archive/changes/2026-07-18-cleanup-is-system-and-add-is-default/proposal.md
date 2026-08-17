## Why

Nachdem `is_system` per Migration `0004_remove_portion_is_system_package` aus dem `Portion`-Modell entfernt und "Packung"-Portionen ins neue `Package`-Modell migriert wurden, blieben Referenzen in Tests und Schemas zurück. Drei Tests in `test_portion_redesign.py` erwarten auto-erstellte "g"/"Packung"/"Stück"-Portionen, die es nicht mehr gibt. `test_display_utils.py` erstellt Portion-Objekte, aber `build_package_display()` nutzt jetzt das `Package`-Modell — die Tests sind ebenfalls kaputt. Gleichzeitig wird `is_default` (rank == 1) vom Backend bereits über `resolve_ingredient_portions` ausgeliefert, fehlt aber in Pydantic- und Zod-Schemas. Auf Prod führt das veraltete Frontend-Bundle (CDN-Cache) zu Zod-Validierungsfehlern für das nicht mehr existierende `is_system`-Feld.

## What Changes

- `is_default: bool` zu `PortionOut` (Pydantic) und `PortionSchema` (Zod) hinzufügen — als Resolver basierend auf `rank == 1`
- Manuelles `is_default` aus `resolve_ingredient_portions()` entfernen (wird jetzt vom Resolver übernommen)
- Alle 3 kaputten Tests in `test_portion_redesign.py` löschen (nicht nur `test_g_portion_is_system`)
- `test_display_utils.py`: `_make_package_portion` auf `Package`-Modell umstellen + alle 7 Tests reparieren + `is_system`-Referenzen und veraltete Kommentare entfernen
- `is_system=False` aus `make_portion`-Aufrufen in `shopping/tests/test_rewe_export.py` entfernen
- Test für `resolve_is_default`-Resolver schreiben
- Frontend-Food neu deployen um CDN-Cache mit veralteter Zod-Schema zu aktualisieren

## Capabilities

### New Capabilities
<!-- No new capabilities — this is a cleanup. -->

### Modified Capabilities
<!-- No requirement changes — field was already returned, just not declared. -->

## Impact

| Bereich | Datei | Änderung |
|---------|-------|----------|
| Backend Schema | `supply/schemas/ingredients.py` | `PortionOut.is_default` + `resolve_is_default` |
| Backend Schema | `recipe/schemas/items.py` | Entferne `is_default` aus `resolve_ingredient_portions` |
| Backend Tests | `supply/tests/test_portion_redesign.py` | Lösche 3 kaputte Tests (lines 155-185) |
| Backend Tests | `supply/tests/test_display_utils.py` | `_make_package_portion` → `Package`-Modell, `is_system` entfernen, Kommentare aktualisieren |
| Backend Tests | `shopping/tests/test_rewe_export.py` | Entferne `is_system=False` aus `make_portion` (lines 78-79) |
| Backend Tests | `supply/tests/test_schemas.py` (neu) | Test für `resolve_is_default` |
| Frontend Schema | `frontend-food/src/schemas/supply.ts` | `PortionSchema.is_default` |
| Deployment | Frontend-Food | Neu bauen + deployen (CDN-Cache-Busting) |
