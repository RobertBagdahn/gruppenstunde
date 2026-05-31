## Why

Beim Planen von Pfadfinderlagern ist das Frühstück (und oft auch Snacks) jeden Tag nahezu identisch. Aktuell muss jedes Frühstück einzeln konfiguriert werden — bei einem 7-Tage-Lager bedeutet das 7× die gleiche Arbeit. Es fehlt eine Möglichkeit, eine "Referenz-Mahlzeit" einmal zu definieren und auf alle gleichartigen Meal-Slots zu synchronisieren.

Zusätzlich fehlt ein Baukasten-System, mit dem man Frühstücke aus vorgefertigten Mini-Rezepten (z.B. "Brot + Nutella", "Müsli", "Kakao") zusammenklicken kann, statt manuell Rezepte zu suchen.

## What Changes

- **Neues RefMeal-Konzept**: Ein `Meal` mit `is_reference=True` dient als Template für einen Meal-Typ innerhalb eines MealPlans. Konkrete Meals können sich darauf verlinken (`ref_meal` FK) und synchronisiert werden (`is_synced`).
- **Sync-Logik**: Änderungen am RefMeal werden auf alle verlinkten Meals übertragen. Bei Änderung an einem konkreten Meal wird gefragt "Für alle übernehmen?".
- **Entkopplung**: Einzelne Meals können vom RefMeal entkoppelt (`is_synced=False`) und wieder verknüpft werden.
- **Baukasten-Ansicht (RefMeal-Editor)**: Eigene UI zum Zusammenklicken von Mini-Rezepten, gefiltert nach `recipe_type` (breakfast, snack, drink).
- **Energie-Normalisierung**: Anzeige Ist vs. Soll-Kalorien (basierend auf `day_part_factor`), Button zum proportionalen Normalisieren der Faktoren.
- **Frühstücks-Mini-Rezepte als Seeds**: Vordefinierter Katalog kleiner Rezepte (Brot+Belag-Varianten, Cerealien, Getränke, Extras) mit KI-geschätzten Portionsmengen.
- **Visuelle Kennzeichnung**: In der Planübersicht ist erkennbar, welche Meals mit einem RefMeal verknüpft sind.

## Capabilities

### New Capabilities
- `ref-meal`: Referenz-Mahlzeit-System — Template-Meals die auf konkrete Meals synchronisiert werden, inklusive Verknüpfungs-/Entkopplungs-Logik
- `ref-meal-editor`: Baukasten-UI zum Zusammenstellen von RefMeals aus Mini-Rezepten mit Energie-Normalisierung
- `breakfast-seed-recipes`: Vordefinierter Katalog von Frühstücks-Mini-Rezepten (Brot+Belag, Cerealien, Getränke, Extras)

### Modified Capabilities
- `meal-plan`: Meal-Model bekommt neue Felder (`is_reference`, `ref_meal`, `is_synced`), Planübersicht zeigt Verknüpfungs-Status
- `meal-plan-frontend`: UI-Erweiterung für RefMeal-Verknüpfung und Sync-Dialog

## Impact

**Backend (Django Apps)**:
- `planner`: Meal-Model erweitern, neue API-Endpunkte für RefMeal CRUD + Sync-Operationen
- `recipe`: Seed-Daten für Mini-Rezepte (Management Command)
- `supply`: Neue Zutaten für Frühstücks-Beläge falls fehlend

**Schemas**:
- Pydantic: `MealOut`, `MealIn` erweitern, neue Schemas `RefMealOut`, `SyncMealIn`
- Zod: Entsprechende Frontend-Schemas in `frontend-food/src/schemas/mealPlan.ts`

**Frontend (frontend-food/)**:
- Neue Route/Page: RefMeal-Editor mit Baukasten-Ansicht
- Erweiterte Meal-Plan-Übersicht mit Verknüpfungs-Icons und Sync-Dialog
- Neue TanStack Query Hooks für RefMeal-Operationen

**Migrations**: Neue Felder auf `Meal` Model (nicht-destruktiv, nullable FKs + bool mit Default)

**Einkaufsliste**: Hochrechnung fließt automatisch korrekt ein, da MealItems auf allen synced Meals identisch sind.
