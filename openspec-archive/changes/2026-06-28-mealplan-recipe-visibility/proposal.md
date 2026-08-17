## Why

Auf der MealPlan-Detailseite (`/meal-plans/:id`) verschwimmen Rezepte visuell mit dem umgebenden Meal-Slot-Header, Stats und Notizen. Sie sind als flache Textzeilen ohne eigenen Container gerendert — das Auge muss jede Zeile einzeln scannen, um Rezepte von Nicht-Rezept-Inhalten zu unterscheiden. Das erschwert die schnelle Erfassung des Essensplans auf einen Blick, besonders auf Mobilgeräten.

## What Changes

- Jedes Rezept, jede Zutat und jede VariantGroup in einem MealSlot wird in eine **farbige Card** verpackt (Hintergrundfarbe abhängig vom Meal-Type: orange/frühstück, cyan/mittagessen, indigo/abendessen, amber/snack)
- Die Card erhält `rounded-lg`, `p-3`, einen subtilen farbigen Border und die Meal-Type-Hintergrundfarbe
- VariantGroups werden als **eine Box** dargestellt (Recipe-Header + alle Varianten gemeinsam)
- Der Empty-State (Such-CTA) bleibt unverändert

## Capabilities

### New Capabilities

- `mealplan-recipe-cards`: Visuelle Aufwertung der Rezept-Darstellung im MealPlan durch farblich getönte Cards pro Meal-Type

### Modified Capabilities

Keine — reine UI-Verbesserung, keine Änderung von Requirements

## Impact

- **Frontend**: `frontend-food/src/pages/planning/MealSlot.tsx` — Änderungen am JSX der Recipe-Items (regular, variant, ingredient)
- **Keine Änderungen**: Backend, API, Schemas, Datenbank, CSS-Variablen
