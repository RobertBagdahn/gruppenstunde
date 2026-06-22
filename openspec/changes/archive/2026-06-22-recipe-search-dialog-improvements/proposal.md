## Why

Der Rezept-Auswahl-Dialog im Essensplan-Frontend enthält mehrere Bugs (kaputte Buttons, Schema-Mismatch, falsche Fehlermeldungen) und UX-Schwächen (hardcodierte Farben, fehlende Filter-Typen, inkorrekte Fallback-Logik), die die tägliche Nutzung beeinträchtigen. Die Probleme wurden durch Code-Review identifiziert und sollen gebündelt behoben werden.

## What Changes

- **Fehlermeldung korrigieren**: Fallback-Banner zeigt ehrlichen Text statt "Keine Rezepte gefunden" wenn Rezepte vorhanden aber nicht genug im Filter-Typ
- **RecentlyUsedSection-Buttons reparieren**: `onClick`-Handler einbauen — aktuell sind alle Buttons tot
- **RecentlyUsedSection in Dialog einbinden**: Komponente wird aktuell gar nicht im Dialog gerendert
- **Schema-Mismatch beheben**: Zod-Schema erwartet `servings`, Backend schickt `portions` — Frontend auf `portions` umstellen
- **`snack`-Filter reparieren**: `ingredient` aus den Default-recipe-types entfernen, da es kein gültiger `recipe_type` ist und immer `fallback_applied=True` auslöst
- **`ingredient`-Typ in CategoryPills ergänzen**: Fehlender Chip, doppelte `RECIPE_TYPE_LABELS`-Definition konsolidieren
- **Hardcodierte Farben entfernen**: `RecipeSearchCard` verwendet `bg-amber-100`, `text-blue-800` etc. — auf Design-Token umstellen
- **`useEffect`-Dependency-Bug fixen**: `eslint-disable`-Kommentar entfernen, `mealType` korrekt in Dependencies aufnehmen
- **Backend: Tag-Filter vor Limit ziehen**: `nutritional_tag_ids` und `exclude_nutritional_tag_ids` werden nach `[:limit]` gefiltert — Logik ins SQL-WHERE verschieben
- **Random-Suggestion Guard einbauen**: Leeres Array von `useRandomRecipeSuggestion` führt zu `undefined` ohne Fehler
- **`portions`-Feld in RecentlyUsed-Schema ergänzen**: Konsistenz mit Search-Endpoint herstellen

## Capabilities

### New Capabilities

- `recipe-search-dialog`: Korrekte Fallback-Kommunikation, RecentlyUsed-Integration, Mehrfachauswahl-Filter, Design-Token-konforme Darstellung

### Modified Capabilities

- keine

## Impact

**Frontend (`frontend-food/`):**
- `src/pages/planning/RecipeSearchDialog.tsx` — useEffect, Fallback-Text, RecentlyUsedSection einbinden
- `src/components/recipe/RecentlyUsedSection.tsx` — onClick-Handler, Props ergänzen
- `src/components/recipe/CategoryPills.tsx` — `ingredient`-Typ ergänzen, RECIPE_TYPE_LABELS exportieren
- `src/components/recipe/RecipeSearchCard.tsx` — hardcodierte Farben entfernen, RECIPE_TYPE_LABELS importieren
- `src/schemas/mealPlan.ts` — `servings` → `portions`, `portions` in RecentlyUsed-Schema
- `src/api/mealPlans.ts` — Guard in `useRandomRecipeSuggestion`

**Backend (`backend/`):**
- `planner/api/meal_plan.py` — `search_recipes()`: Tag-Filter vor `[:limit]` ins Queryset verschieben

**Keine Migrationen erforderlich.**
**Keine neuen Abhängigkeiten erforderlich.**
