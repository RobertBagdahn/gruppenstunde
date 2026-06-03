# Recipe AI Ingredient Suggestions — Spec

## Overview

KI-Button im InlineIngredientEditor, der passende Zutaten vorschlägt und nach Bestätigung hinzufügt.

## Requirements

### Functional

1. Im Bearbeitungsmodus erscheint ein Button mit Sparkles-Icon in der Toolbar
2. Klick auf den Button ruft `POST /api/recipes/{id}/ai-suggest-ingredients/` auf
3. Während der KI-Anfrage zeigt der Button einen Loading-Spinner
4. Bei Fehler wird ein Error-Toast angezeigt

### Confirmation Flow

1. Ergebnisse werden in einem modalen Dialog angezeigt (nicht direkt angewendet)
2. Dialog zeigt: Zutatname, Portion, Menge pro Vorschlag
3. Jeder Vorschlag hat eine Checkbox (standardmäßig aktiviert)
4. "Alle auswählen" Checkbox im Header
5. Button "Übernehmen (N)" wendet nur die ausgewählten Vorschläge an
6. Button "Verwerfen" schließt den Dialog ohne Änderungen
7. Nach Übernehmen: `POST /api/recipes/{id}/ai-apply-ingredients/` mit gewählten Items, dann Query-Invalidierung und Toast

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
- Position: In der Toolbar neben "Mengen schätzen"
