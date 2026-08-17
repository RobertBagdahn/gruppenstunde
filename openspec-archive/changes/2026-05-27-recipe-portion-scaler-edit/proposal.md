## Why

Im InlineIngredientEditor (Bearbeitungsmodus der Rezept-Detailseite) können Zutatenmengen nur manuell pro Zeile geändert werden. Wenn ein Nutzer die Portionszahl ändert (z.B. von 4 auf 8), müssen alle Mengen einzeln angepasst werden. Es fehlt eine automatische proportionale Skalierung der Mengen beim Ändern der Basis-Portionszahl.

## What Changes

- **Portionen-Skalierung im Edit-Modus**: Wenn die Basis-Portionszahl im `InlineIngredientEditor` geändert wird, werden alle Zutatenmengen proportional umgerechnet (alte Portion → neue Portion).
- **Verbessertes visuelles Design**: Die Zutatenliste im Edit-Modus wird optisch aufgewertet (bessere Abstände, klarere Unit-Labels, kompaktere Notiz-Felder).

## Capabilities

### New Capabilities

- `recipe-portion-scaling-edit`: Automatische proportionale Skalierung der Zutatenmengen beim Ändern der Portionszahl im Bearbeitungsmodus.

### Modified Capabilities

_(keine)_

## Impact

- **Frontend**: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` — Logik für proportionale Umrechnung + UI-Verbesserungen
- **Backend**: Keine Änderungen nötig (Portionen-Feld existiert bereits im API-Schema)
- **Schemas**: Keine Änderungen nötig (Pydantic/Zod bleiben gleich)
- **Migrations**: Keine
