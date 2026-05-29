## Why

Die `smartRound()`-Funktion in `frontend-food/src/lib/unitConversion.ts` rundet alle Mengen unter 100g auf 5er-Schritte. Bei kleinen Zutatenmengen (z.B. 3,75g Butter, 0,25g Vanillezucker) führt das zu völlig falschen Anzeigen: 3,75g wird zu 5g, 0,25g wird zu 0g. Besonders bei Rezepten mit vielen Portionen (wo pro Person nur kleine Mengen anfallen) ist die Normalansicht unbrauchbar.

## What Changes

- `smartRound()` erhält feinere Rundungsstufen für kleine Mengen:
  - < 1g: auf 0,1g runden
  - 1–10g: auf 1g runden
  - 10–100g: auf 5g runden (wie bisher)
  - 100–999g: auf 10g runden (wie bisher)
  - 1000g+: auf 50g runden (wie bisher)
- Gleiche Logik für ml-basierte Anzeigen (über Density-Konvertierung)

## Capabilities

### New Capabilities

- `fine-grained-quantity-rounding`: Feinere Rundungsstufen für kleine Mengen in der Rezept-Zutatenanzeige

### Modified Capabilities

(keine)

## Impact

- **Betroffene Datei**: `frontend-food/src/lib/unitConversion.ts` — Funktion `smartRound()`
- **Betroffene Komponente**: `frontend-food/src/components/supply/IngredientList.tsx` (nutzt `formatQuantity()` welches `smartRound()` aufruft)
- **Keine API-Änderungen**: Rein Frontend-seitige Logik
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod betroffen
- **Keine Migrationen nötig**
