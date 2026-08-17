## Why

Die Zutaten-Anzeige auf der Rezept-Detailseite zeigt für viele Zutaten fälschlich "0 g" an, obwohl im Editor Einheiten wie `Pr` (Prise), `TL`, `EL` mit korrekten Mengen hinterlegt sind. Die Ursache: Das Frontend löst die `measuring_unit` über die Portion auf, erhält dadurch immer "Gramm" als Einheit, und versucht eine Gramm-Umrechnung — die fehlschlägt wenn `weight_g` der Portion 0 oder NULL ist.

## What Changes

- **BREAKING**: Die `IngredientList`-Komponente zeigt Mengen in der Original-Einheit des Editors an (z.B. "15 Pr", "2 TL", "5 EL") statt alles in Gramm umzurechnen
- Das Backend-Schema `RecipeItemOut` liefert die direkte `measuring_unit` vom RecipeItem **und** die der Portion separat, sodass das Frontend die Editor-Einheit rekonstruieren kann
- Gramm-Umrechnung (`formatQuantity`) wird nur noch für tatsächliche Gewichtseinheiten (g, kg, ml, l) angewendet
- Bei Mengen die nicht 0 sein können: Kommazahlen statt Rundung auf 0

## Capabilities

### New Capabilities

(keine neuen Capabilities)

### Modified Capabilities

- `recipe-quantity-display`: Anzeige-Logik ändert sich — Originaleinheit statt Gramm-Konvertierung für nicht-Gewichtseinheiten
- `unit-conversion`: `formatQuantity` wird nur noch für echte Gewichts-/Volumeneinheiten aufgerufen

## Impact

- **Backend**: `recipe/schemas/items.py` — `RecipeItemOut` muss die direkte `measuring_unit_name` des RecipeItems liefern (nicht den Fallback auf Portion). Neues Feld oder geändertes Resolve-Verhalten.
- **Frontend**: `src/components/supply/IngredientList.tsx` — Logik zur Einheitenerkennung und Mengenanzeige
- **Frontend**: `src/lib/unitConversion.ts` — ggf. Anpassung von `formatQuantity`
- **Schemas**: `RecipeItemOut` (Pydantic) und `RecipeItemSchema` (Zod) müssen synchron bleiben
- **Keine Migration nötig** — die Daten sind korrekt im Model, nur die Schema-Auflösung ist falsch
