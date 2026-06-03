## Why

Der KI-Vorschläge-Button im InlineIngredientEditor wendet Vorschläge aktuell direkt an (`ai-apply-ingredients`), ohne dass der Nutzer die Zutaten vorher sehen oder auswählen kann. Der Nutzer soll erst die Vorschläge sehen, einzeln an-/abwählen, und dann bewusst speichern.

## What Changes

- KI-Vorschläge werden nach Klick in einem Auswahl-Dialog angezeigt (ähnlich dem bestehenden "AI-Mengenschätzung"-Dialog)
- Nutzer kann einzelne Vorschläge per Checkbox an-/abwählen
- Erst nach Bestätigung werden die gewählten Zutaten per `ai-apply-ingredients` übernommen

## Capabilities

### New Capabilities
_(keine neuen — Erweiterung des bestehenden Flows)_

### Modified Capabilities
- `recipe-ai-ingredient-suggestions`: Vorschläge werden nicht mehr automatisch angewendet, sondern erst nach Bestätigung durch den Nutzer

## Impact

- **Frontend**: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` — `handleAiSuggest` umbauen, Bestätigungs-Dialog hinzufügen
- **Backend**: Keine Änderungen (Endpunkte bleiben gleich)
- **Schemas**: Keine Änderungen
