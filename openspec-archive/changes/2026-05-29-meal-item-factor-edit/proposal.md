## Why

Im Essensplan können einem Meal mehrere Rezepte zugeordnet werden (z.B. 3 verschiedene Brotsorten zum Frühstück). Dabei soll jedes Rezept nur anteilig zählen (z.B. je ×0.33), weil nicht alle Teilnehmer dasselbe essen. Das Backend-Feld `MealItem.factor` existiert bereits, aber es gibt weder eine API zum Ändern noch ein UI-Element zum Editieren.

## What Changes

- Neuer PATCH-Endpunkt für `MealItem` zum Aktualisieren des `factor`-Feldes
- Pydantic-Schema `MealItemUpdateIn` mit optionalem `factor`-Feld
- Frontend: Immer sichtbares Inline-Input-Feld für den Factor pro MealItem (Option B)
- TanStack Query Mutation Hook für das MealItem-Update

## Capabilities

### New Capabilities
- `meal-item-factor-edit`: Editieren des Skalierungsfaktors eines MealItems über ein Inline-Input im Essensplan

### Modified Capabilities

(keine)

## Impact

- **Backend**: `planner` App — neuer PATCH-Endpunkt, neues Pydantic-Schema `MealItemUpdateIn`
- **Frontend-Food**: `MealEventDetailPage.tsx` — Inline-Input für Factor statt reine Anzeige
- **Schemas**: Pydantic `MealItemUpdateIn` (neu), Zod-Schema ggf. erweitern für Mutation
- **Migrations**: Keine — das `factor`-Feld existiert bereits auf `MealItem`
