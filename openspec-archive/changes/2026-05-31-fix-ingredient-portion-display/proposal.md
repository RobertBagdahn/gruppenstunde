## Why

Die Subzeile unter jeder Zutat in der Rezeptansicht zeigt unsinnige Informationen an. Portionen mit `weight_g ≈ 1` (die Basis-Gramm-Portion) werden als "highPrioPortion" angezeigt, was zu Ausgaben wie "≈ 100 g" oder "≈ 40 100g Käse (Gouda)" führt — redundant zur Hauptzeile und verwirrend für Nutzer. Außerdem fehlt beim Preis die Bezugsgröße.

## What Changes

- Filter in `IngredientList.tsx` für `highPrioPortion` anpassen: Portionen mit `weight_g <= 1` ausschließen (analog zu `portionDisplay.ts:73`)
- Portionen mit generischen Namen (z.B. "g", "ml") zusätzlich ausfiltern, selbst wenn `is_default=false`
- Preis-Anzeige um Bezugsgröße ergänzen (z.B. "0,28 €/Portion" statt nur "0,28 €")
- Redundante Darstellung verhindern: wenn highPrioDisplay nur die Grammzahl wiederholt, nicht anzeigen

## Capabilities

### New Capabilities

_Keine neuen Capabilities._

### Modified Capabilities

- `portion-display-filter`: Filterlogik für die highPrioPortion-Anzeige verschärfen, sodass Basis-Portionen (weight_g ≤ 1) und generische Namen nie als sekundäre Portions-Anzeige erscheinen

## Impact

- **Frontend**: `frontend-food/src/components/supply/IngredientList.tsx` (Zeile 82-87)
- **Keine Schema-Änderungen**: Pydantic/Zod-Schemas bleiben unverändert
- **Keine Migrations**: Kein Datenmodell betroffen
- **Betroffene App**: `supply` (Frontend-Komponente), `recipe` (Rezept-Detailseite nutzt IngredientList)
