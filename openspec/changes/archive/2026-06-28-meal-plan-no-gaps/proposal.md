## Why

Der MealPlan erlaubt aktuell beliebige Daten für Tage — Lücken im Datumsbereich sind möglich, aber fachlich unsinnig. Ein Essensplan repräsentiert einen zusammenhängenden Zeitraum (Lager, Wochenende), in dem jeder Tag Verpflegung braucht. Die fehlende Validierung führt zu inkonsistenten Zuständen und verwirrender UI. Dies schafft klare Invarianten und verhindert Lücken hart an der API.

## What Changes

- Validierungsfunktion `validate_meal_plan_contiguity` für lückenlose Datumsbereiche
- **POST `/{id}/days/`**: Range automatisch erweitern, wenn Datum außerhalb liegt
- **DELETE `/{id}/days/`**: Nur Rand-Tage löschbar (Mitte → 400), Range automatisch schrumpfen
- **PATCH `/{id}/`**: Bei Änderung von `start_datetime`/`end_datetime` → Smart Merge (alte Tage außerhalb löschen, fehlende Tage neu anlegen, bestehende behalten)
- **POST `/{id}/meals/`** und **DELETE `/{id}/meals/{mid}`**: Keine Gap-Validierung (zu granular)
- Existierende Endpunkte `add-day-before`/`add-day-after` bleiben unverändert (bereits korrekt)
- Validierung greift nur, wenn BOTH `start_datetime` AND `end_datetime` gesetzt sind
- Bei Verstoß: HTTP 400 mit deutscher Fehlermeldung

## Capabilities

### New Capabilities
- `meal-plan-contiguity`: Lückenlose Datumsbereiche für MealPlans — Validierung, Smart Merge, Edge-Manipulation

### Modified Capabilities

(keine — neues Feature, keine bestehenden Specs werden geändert)

## Impact

- **Backend**: `planner/api/meal_plan.py` — neue Validierungs-/Merge-Funktionen, Änderungen an `add_day`, `remove_day`, `update_meal_plan`
- **Backend**: `planner/schemas/meal_plan.py` — ggf. neue Fehler-Schemas
- **Frontend**: `frontend-food/src/api/mealPlans.ts` — `useAddDay` Hook bleibt ungenutzt (entfernen?), `useRemoveDay` bekommt neuen Fehlerfall (400 bei Mitteltag)
- **Frontend**: `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — Fehlerbehandlung für neue 400-Fälle
- **Tests**: Neue Tests für Validierung, Smart Merge, Edge Cases
- **Migrationen**: Keine (reine Logik-Änderung, kein Schema-Change)
