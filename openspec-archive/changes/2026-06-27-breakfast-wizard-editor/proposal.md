## Why

Der Frühstücksassistent (Breakfast Wizard) kann Basis, Belag, Extras und Getränke als strukturierte Items speichern, aber die RefMeal-Vorschau-Seite (`/meal-plans/:id/ref-meals/breakfast`) zeigt diese Items nicht korrekt an: ingredient-basierte Items (Brot, Belag) erscheinen als "Rezept #null", und der manuelle Rezept-Baukasten ist für Breakfast ungeeignet — nur der Wizard soll Änderungen vornehmen.

## What Changes

- **Backend**: `MealItemOut` um `ingredient_tags` und `recipe_type` erweitern, damit Frontend Wizard-Items korrekt gruppieren und anzeigen kann
- **Backend**: Neuer GET `/api/supply/breakfast-catalog/drinks/` Endpoint für Getränke-Rezepte
- **Backend**: Seed-Daten: Kaffee, Kakao, Tee, Milch als Rezepte mit `recipe_type="drink"`
- **Frontend (generisch)**: `RefMealEditorPage` zeigt `ingredient_name` für ingredient-basierte Items statt "Rezept #null"
- **Frontend (breakfast)**: `RefMealEditorPage` erhält einen Breakfast-Mode mit read-only gruppierter Vorschau, keinem Rezept-Picker, keinem Speichern-Button und getrennter Energie-Anzeige (Essen/Getränke)
- **Frontend (breakfast-empty)**: Wenn kein Breakfast-RefMeal existiert, direktes Redirect zu `/wizard`
- **Frontend (wizard)**: `BreakfastWizardPage` lädt bestehendes RefMeal und mappt Items zurück in Wizard-State (alle Schritte vorausgefüllt)
- **Frontend (wizard)**: Abbrechen-Button ohne Speichern
- **Frontend (drinks)**: Getränke werden als `recipe_id` mit `recipe_type="drink"` gespeichert statt als `display_name`-Items

## Capabilities

### New Capabilities
- `breakfast-wizard-editor`: Überarbeitete RefMeal-Vorschau für Frühstück — gruppierte Kategorien, kein manuelles Hinzufügen, getrennte Energie-Anzeige
- `drink-recipes`: Getränke-Rezepte als Recipe-Type "drink" mit eigenem Catalog-Endpoint, automatische Zuordnung über Wizard-Slider
- `meal-item-display`: Korrekte Anzeige von ingredient-basierten Items (ingredient_name, ingredient_tags) im RefMeal-Editor

### Modified Capabilities
- `breakfast-wizard`: Wizard kann bestehende RefMeals laden, vorausfüllen und abbrechen; Getränke werden als recipe_id gespeichert

## Impact

- **Backend**: `planner/schemas/meal_plan.py` (MealItemOut + ingredient_tags, recipe_type), `supply/api/breakfast_catalog.py` (neuer drinks-Endpoint)
- **Backend**: Neue Seed-Daten für Getränke-Rezepte
- **Backend**: Keine Migration — nur Schema-Änderungen am Serializer
- **Frontend**: `frontend-food/src/pages/planning/RefMealEditorPage.tsx` (breakfast-Mode, generischer Display-Fix)
- **Frontend**: `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx` (load existing, abbrechen, recipe_id drinks)
- **Frontend**: `frontend-food/src/schemas/mealPlan.ts` (MealItemSchema + ingredient_tags, recipe_type)
- **Frontend**: `frontend-food/src/api/breakfast.ts` (neuer useDrinkRecipes Hook)
- **Frontend**: `frontend-food/src/schemas/breakfast.ts` (ggf. neue Hooks/Schemas für drinks)
