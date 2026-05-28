## Why

In der Rezept-Zutatenliste wird für jede Zutat eine "ca. X x Stück/Gramm"-Anzeige generiert, die auf den `Portion`-Stammdaten basiert. Wenn eine Zutat nur eine Fallback-Portion mit `weight_g=1` hat (z.B. "Gramm"), zeigt die Anzeige unsinnige Werte wie "ca. 35000 x Stück" bei 35kg Gemüsegurke. Die Information ist redundant zur bereits angezeigten Gramm-Angabe.

## What Changes

- **Frontend**: `portionDisplay.ts` filtert Portionen mit `weight_g <= 1` aus der "ca. X x"-Anzeige heraus — diese sind redundant zur Gramm-Anzeige
- **Backend**: Keine Änderung nötig — die `weight_g=1` Fallback-Portion im AI-Service ist korrekt und soll bleiben

## Capabilities

### New Capabilities
- `portion-display-filter`: Frontend-Logik zum Ausfiltern redundanter Portionsanzeigen (weight_g <= 1)

### Modified Capabilities

## Impact

- **Frontend**: `frontend-food/src/lib/portionDisplay.ts` — `calculateNaturalPortions()` Funktion
- **Betroffene Komponenten**: `IngredientList.tsx`, `ShoppingListItemRow.tsx`
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod Schemas betroffen
- **Keine Migrations**: Kein DB-Change
