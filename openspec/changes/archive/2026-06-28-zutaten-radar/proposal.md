## Why

Der aktuelle "Allergen-Scan" prüft nur Recipe-nutritional_tags gegen MealPlan-Einschränkungen — und nur für `is_dangerous=True`-Tags. Nicht-dangeröse Tags (z.B. "vegan", "vegetarisch") auf Zutaten-Ebene werden ignoriert, und Standalone-Ingredients im MealPlan werden gar nicht gescannt. Der Scan deckt nicht ab, was wirklich in den Zutaten steckt. Gleichzeitig ist der Begriff "Allergene Radar" irreführend, da längst nicht nur Allergene gescannt werden sollen.

Dieser Change erweitert den Scan zu einem echten **Zutaten-Radar**: Alle NutritionalTags aller Zutaten in einem MealPlan werden gegen die Plan-Einschränkungen geprüft.

## What Changes

- **BREAKING**: API-Endpoint `/allergen-scan/` umbenannt zu `/ingredient-scan/`
- **BREAKING**: Frontend-Komponenten `AllergenScanView`, `AllergenIndicator`, `AllergenWarningBadge` umbenannt
- **Neu**: Sync aller NutritionalTags (nicht nur `is_dangerous=True`) von Ingredient → Recipe
- **Neu**: Backfill-Management-Command für bestehende Rezepte
- **Neu**: Scanlogik prüft auch Standalone-Ingredients direkt im MealPlan
- **Neu**: Deep Scan: für Recipe-basierte MealItems werden sowohl Recipe-Tags als auch Ingredient-Tags via RecipeItem abgeprüft
- **Neu**: UI-Labels und -Texte durchgehend auf "Zutaten-Radar" / "Ernährungstags" geändert

## Capabilities

### New Capabilities
- `ingredient-scan`: Scanning von MealPlans auf NutritionalTag-Konflikte auf Zutatenebene

### Modified Capabilities
<!-- Keine bestehenden Specs betroffen -->

## Impact

**Backend:**
- `supply/services/nutri_service.py` — Sync-Logik erweitern (alle Tags, nicht nur dangerous)
- `recipe/services/recipe_checks.py` — `sync_recipe_allergen_tags` → `sync_recipe_nutritional_tags`
- `recipe/signals.py` — Signal-Handler an neue Sync-Funktion anpassen
- `planner/api/meal_plan.py` — Scan-Endpoint umbenennen und Logik erweitern
- `planner/schemas/meal_plan.py` — Schemas ggf. anpassen/umbenennen
- `planner/tests/test_meal_plan_allergens.py` — Tests umbenennen und erweitern
- `recipe/management/commands/sync_recipe_allergen_tags.py` — Backfill-Command erweitern
- Migration: keine Datenmodell-Änderungen (nur Logik)

**Frontend (food):**
- `src/api/mealPlans.ts` — Hook umbenennen, Query-Key ändern
- `src/pages/planning/AllergenScanView.tsx` → `IngredientScanView.tsx`
- `src/components/recipe/AllergenIndicator.tsx` → NutriTagIndicator (oder äquivalent)
- `src/components/shared/AllergenWarningBadge.tsx` → NutriTagBadge (oder äquivalent)
- `src/pages/planning/MealSlot.tsx`, `ShoppingView.tsx`, `NutritionView.tsx` etc. — Importe aktualisieren
- `src/schemas/mealPlan.ts` — ggf. Schemas anpassen
