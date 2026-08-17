## Why

Die aktuelle Rezeptsuche im Meal Planner ist ein einfaches `title__icontains`-Textfeld ohne Debouncing, ohne Filter und ohne Kontext zum Meal-Typ. Nutzer, die nicht genau wissen welches Rezept sie wollen, haben keine Möglichkeit zu browsen oder nach Kriterien zu filtern. Der vorhandene Full-Text-Search GIN-Index wird nicht genutzt.

## What Changes

- **Quick Search verbessern**: Debouncing (300ms), Full-Text-Search via `search_vector`, Keyboard-Navigation (Pfeiltasten + Enter), max 8 Ergebnisse mit Recipe-Type-Info
- **Dialog Search einführen**: Neuer Button neben dem Suchfeld öffnet einen Dialog mit erweiterter Filterung (Recipe-Type, Nutritional Tags), vorgefilterter basierend auf dem `meal_type` des Meals
- **Backend-Endpunkt erweitern**: `/api/meal-plans/recipes/search/` um Full-Text-Search und Filter-Parameter ergänzen (`recipe_type`, `nutritional_tags`, `meal_type` für Kontext-Mapping)
- **Kontext-Mapping**: Automatischer Vorfilter des Recipe-Type basierend auf Meal-Type (z.B. lunch → warm_meal, cold_meal, side_dish)

## Capabilities

### New Capabilities

- `meal-planner-recipe-search`: Erweiterte Rezeptsuche im Meal Planner mit Quick Search (Inline-Autocomplete) und Dialog Search (Filter-basiertes Browsen mit Meal-Type-Kontext)

### Modified Capabilities

_(keine bestehenden Spec-Änderungen nötig)_

## Impact

- **Backend**: `planner/api/meal_plan.py` — Endpunkt `search_recipes` erweitern um Full-Text-Search und Filter-Parameter
- **Frontend**: `pages/planning/MealEventDetailPage.tsx` — Quick Search refactoren, neuen Dialog-Button und RecipeSearchDialog-Komponente hinzufügen
- **Schemas**: Neues Pydantic-Schema für Search-Filter-Parameter, Zod-Schema für Frontend
- **Keine Migrations nötig** (nutzt bestehenden `search_vector` Index)
- **Betroffene Apps**: `planner` (Backend), `planning` Pages (Frontend)
