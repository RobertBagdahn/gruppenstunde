## 1. Backend: Schema-Fix

- [x] 1.1 `recipe/schemas/items.py` — `resolve_measuring_unit_name`: Fallback auf `portion.measuring_unit.name` entfernen. Nur `obj.measuring_unit.name` zurückgeben, sonst `None`.
- [x] 1.2 `recipe/schemas/items.py` — `resolve_measuring_unit_id`: Analog den Portion-Fallback entfernen.
- [x] 1.3 Testen: API-Response für ein Rezept mit Pr/TL/EL-Zutaten prüfen — `measuring_unit_name` muss NULL sein wenn keine direkte Unit am Item.

## 2. Frontend: IngredientList Anzeige-Logik

- [x] 2.1 `src/components/supply/IngredientList.tsx` — Logik anpassen: Wenn `measuring_unit_name` NULL und `quantity > 0`, die Portion-Name als Einheit verwenden (aus `portion_name` Feld) oder nur die Menge ohne Einheit anzeigen.
- [x] 2.2 `src/components/supply/IngredientList.tsx` — Wenn `measuring_unit_name` vorhanden und NICHT in `WEIGHT_VOLUME_UNITS`: direkt `"{qty} {unit}"` anzeigen ohne formatQuantity.
- [x] 2.3 `src/components/supply/IngredientList.tsx` — Wenn `measuring_unit_name` NULL und `quantity === 0`: nur Zutat-Name anzeigen (kein "0 g").

## 3. Frontend: formatQuantity 0-Rundung verhindern

- [x] 3.1 `src/lib/unitConversion.ts` — `formatQuantity`: Wenn Eingabe > 0, niemals "0" als Zahl ausgeben. Mindestens eine Nachkommastelle (z.B. "0,3 g").

## 4. Verifizierung

- [x] 4.1 Rezept mit gemischten Einheiten (g, Pr, TL, EL) im Browser prüfen — alle Einheiten korrekt angezeigt.
- [x] 4.2 Essensplan-Zutatenansicht prüfen — nutzt ggf. gleiche Komponente/Logik.
