# Recipe AI Ingredient Suggestions — Spec

## Overview

KI-Button im InlineIngredientEditor, der drei passende Zutaten vorschlägt und direkt hinzufügt.

## Requirements

### Functional

1. Im Bearbeitungsmodus erscheint ein Button mit Sparkles-Icon neben dem Zutat-Eingabefeld
2. Klick auf den Button ruft `POST /api/recipes/{id}/ai-suggest-ingredients/` auf
3. Die Vorschläge werden sofort per `POST /api/recipes/{id}/ai-apply-ingredients/` angewendet
4. Die lokale Zutatenliste wird nach Anwendung aktualisiert (Query-Invalidierung)
5. Während der KI-Anfrage zeigt der Button einen Loading-Spinner
6. Bei Fehler wird ein Error-Toast angezeigt

### Bugfix: Autocomplete Input

1. Das Autocomplete-Eingabefeld im InlineIngredientEditor muss einen lokalen State verwenden
2. `value` wird an den State gebunden, `onChange` aktualisiert den State
3. Nach erfolgreichem Hinzufügen einer Zutat wird der Input-State auf `""` zurückgesetzt

## API (bestehend)

```
POST /api/recipes/{recipe_id}/ai-suggest-ingredients/
Response: [{ ingredient_id, ingredient_name, portion_id, portion_name, quantity, is_new_ingredient }]

POST /api/recipes/{recipe_id}/ai-apply-ingredients/
Body: [{ ingredient_id, portion_id, quantity }]
Response: [RecipeItemOut]
```

## UI

- Button-Label: Tooltip "KI-Vorschläge"
- Icon: `Sparkles` aus lucide-react
- Position: Rechts neben dem Autocomplete-Input oder in der Toolbar neben "Mengen schätzen"
