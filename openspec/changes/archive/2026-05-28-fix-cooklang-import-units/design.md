## Context

Der Cooklang-Importer parsed `@Ingredient{qty%unit}` Syntax korrekt, aber die Unit-Resolution (Zeile 292-300) hat ein unvollständiges `unit_aliases` dict und fällt bei unbekannten Einheiten auf Gramm zurück.

## Goals / Non-Goals

**Goals:**
- Alle gängigen deutschen Koch-Einheiten korrekt auflösen
- Volumen-/Gewichts-Einheiten in Gramm umrechnen wo möglich (kg→g, L→ml)
- Nicht-auflösbare Einheiten als Note speichern

**Non-Goals:**
- Bestehende falsch-importierte Rezepte reparieren (separater Fix)
- Neue MeasuringUnits in der DB anlegen

## Decisions

1. **Umrechnung statt neue Units**: "kg" wird zu quantity×1000 in Gramm umgerechnet, "L" wird zu quantity×1000 in Milliliter. Das passt zur bestehenden Portion/weight_g Architektur.

2. **unit_aliases erweitern**: Fehlende Einträge: `"l"→"milliliter"`, `"liter"→"milliliter"`, `"kg"→"gramm"`, `"kilogramm"→"gramm"`, `"ml"→"milliliter"`, `"packung"→"packung"`, `"paket"→"packung"`, `"tüte"→"packung"`, `"el"→"esslöffel"`, `"tl"→"teelöffel"`.

3. **Umrechnungsfaktoren**: Definiere ein `UNIT_CONVERSION` dict das bei Einheiten-Auflösung die Quantity multipliziert:
   - `"kg"` → multiply by 1000, resolve to "gramm"
   - `"l"/"liter"` → multiply by 1000, resolve to "milliliter"

4. **Fallback-Strategie**: Wenn unit nicht auflösbar → `measuring_unit=gram_unit`, quantity bleibt, unit-Text wird in `note` gespeichert.

## Risks / Trade-offs

- Einheiten wie "Packung" oder "kleines Paket" haben kein festes Gramm-Äquivalent → werden als MeasuringUnit gespeichert falls vorhanden, sonst als Note
