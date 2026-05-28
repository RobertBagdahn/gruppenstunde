## Why

Im Essensplaner können aktuell nur Rezepte einer Mahlzeit zugeordnet werden. Viele Snacks und Getränke (Äpfel, Wasser, Schokolade) sind aber einfach Zutaten, die roh konsumiert werden – ohne Rezept. Gruppenführer müssen dafür aktuell Pseudo-Rezepte anlegen, was unnötiger Aufwand ist.

## What Changes

- **Ingredient-Model erweitern**: Neues Flag `is_standalone_food` + `standalone_type` (nutzt bestehende `RecipeTypeChoices`), um Zutaten als eigenständig konsumierbar zu markieren
- **MealPlanItem erweitern**: Alternativ zu einem Rezept kann jetzt eine Zutat (mit Portion + Menge) direkt zugeordnet werden. XOR-Constraint: entweder Recipe oder Ingredient
- **Unified Search API**: Der bestehende Rezept-Such-Endpoint liefert zusätzlich passende standalone Ingredients (gefiltert nach `standalone_type` und `nutritional_tags`)
- **Frontend RecipeSearchDialog**: Zeigt Zutaten als eigene Ergebnissektion. Bei Auswahl einer Zutat öffnet sich ein Mengen-Dialog (Portion wählen + Menge eingeben)

## Capabilities

### New Capabilities
- `standalone-ingredient`: Zutaten als eigenständige Lebensmittel markieren und direkt in Mahlzeitenpläne einfügen

### Modified Capabilities
- `meal-planner-recipe-search`: Such-Endpoint liefert jetzt auch standalone Ingredients, Frontend zeigt gemischte Ergebnisse
- `meal-plan`: MealPlanItem unterstützt jetzt Ingredient als Alternative zu Recipe

## Impact

- **Backend Models**: `supply/models/ingredient.py` (neue Felder), `planner/models/` (MealPlanItem erweitern)
- **Migration**: 2 Migrationen (supply + planner)
- **Backend API**: `planner/api/meal_plan.py` (search endpoint erweitern)
- **Backend Schemas**: Neue Response-Schemas für unified search, MealPlanItem-Schema erweitern
- **Frontend Schemas**: Zod-Schemas für search response + MealPlanItem anpassen
- **Frontend Components**: `RecipeSearchDialog.tsx` (Zutaten-Section + Mengen-Dialog)
- **Frontend API**: `mealPlans.ts` (Hook + Typen anpassen)
