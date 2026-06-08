## Why

Pfadfinder-Gruppenführer müssen bei der Essensplanung für Lager sicherstellen, dass keine Teilnehmer Allergene zu sich nehmen. Aktuell gibt es keine automatische Prüfung: Rezepte werden manuell geprüft, was fehleranfällig und zeitaufwendig ist. Ein Allergie-Scanner im MealPlan erkennt automatisch Verstöße gegen konfigurierte Allergene (z. B. Erdnüsse, Gluten, Milch) und warnt überall in der UI.

## What Changes

- **Backend**: Neues M2M-Feld `allergen_tags` auf `MealPlan` (FK zu `NutritionalTag` mit `is_dangerous=True`)
- **Backend**: Automatische Synchronisation der `nutritional_tags` von Zutaten → Rezept bei jedem Rezept-Update (Signal/Service)
- **Backend**: Neuer API-Endpunkt `GET /api/meal-plans/{id}/allergen-scan/` für Scanner-Tab
- **Backend**: Rezept-Suche filtert Allergene des MealPlans automatisch aus (schon via `nutritional_tag_ids` möglich, wird Default)
- **Frontend**: Neuer Tab "Allergie-Scanner" im MealPlan-Detail mit Übersicht aller Verstöße
- **Frontend**: Warnhinweise (🚨 rot) in allen MealPlan-Ansichten: Tagesplan, Tabelle, Einkaufsliste, Nährwerte, Kosten
- **Frontend**: RecipeSearchDialog zeigt 🚨-Badges auf Rezepten mit Allergenen, Auto-Ausschluss als Default
- **Frontend**: Neue Zod-Schemas für Scanner-Response, erweiterte MealPlan-Schemas mit `allergen_tag_ids`
- **Migration**: Django-Migration für neues M2M-Feld `allergen_tags` auf `MealPlan`

## Capabilities

### New Capabilities

- `mealplan-allergen-tags`: MealPlan kann Allergene (NutritionalTag mit is_dangerous) als Tags zugewiesen bekommen
- `mealplan-allergen-scan`: API-Endpunkt liefert alle Verstöße pro Meal/Rezept/Allergen mit Source (recipe_tag)
- `mealplan-allergen-warnings`: UI-Komponenten zeigen rote Warnungen bei Allergenverstößen
- `recipe-allergen-sync`: Automatische Aktualisierung der Rezept-Allergene basierend auf Zutaten beim Speichern

### Modified Capabilities

- `meal-plan`: Erweitert um Allergen-Tags und Scanner-Integration
- `recipe-management`: Rezept-Update triggert Allergen-Sync von Zutaten
- `recipe-search`: Standard-Filter schließt MealPlan-Allergene aus

## Impact

**Backend (planner app):**
- `models/meal_plan.py`: Neues M2M-Feld `allergen_tags`
- `schemas/meal_plan.py`: Schemas um `allergen_tag_ids` erweitern
- `api/meal_plan.py`: Neuer Endpunkt `/allergen-scan/`, PATCH/POST `allergen_tag_ids` unterstützen
- Migration: `makemigrations planner`

**Backend (recipe app):**
- `services/recipe_checks.py` oder neuer Service: `sync_recipe_allergen_tags_from_ingredients(recipe)`
- Signal auf `RecipeItem`/`Recipe` save: Sync triggern
- `models/recipe.py`: Keine Modell-Änderung nötig (nutzt bestehendes `nutritional_tags` M2M)

**Frontend (frontend-food):**
- `schemas/mealPlan.ts`: `MealPlanSchema`/`DetailSchema` um `allergen_tag_ids` + `AllergenScanResponseSchema`
- `api/mealPlans.ts`: Hook `useAllergenScan(mealPlanId)`, `useMealPlan`/`useUpdateMealPlan` erweitert
- `pages/planning/MealEventDetailPage.tsx`: Neuer Tab "Allergie-Scanner", Warn-Banner in allen Tabs
- `pages/planning/TableView.tsx` / `DayPlanView.tsx`: 🚨-Icons auf MealItems
- `pages/planning/ShoppingView.tsx`: Hervorhebung verletzender Zutaten
- `pages/planning/RecipeSearchDialog.tsx`: Auto-Filter + 🚨-Badges
- `components/planning/AllergenScannerTab.tsx` (neu)
- `components/shared/AllergenWarningBadge.tsx` (neu)

**Datenbank:**
- Migration für `planner_mealplan_allergen_tags` M2M-Tabelle