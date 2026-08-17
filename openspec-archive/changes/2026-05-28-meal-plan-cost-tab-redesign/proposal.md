## Why

Der Kosten-Tab im Essensplan-Detail (`/meal-plans/:id`) zeigt aktuell nur eine einfache Tabelle mit Tagesaufschlüsselung. Die separate `/cost-calculation`-Seite bietet eine reichhaltigere Darstellung (Rezept-Einzelpreise, Pro-Person-pro-Tag-Kennzahl, Link zur Preispflege). Diese Informationen sollen direkt im Kosten-Tab des Essensplans verfügbar sein — als "Best of Both" aus beiden bestehenden Ansichten, aber gefiltert auf den aktuellen Plan.

## What Changes

- Kosten-Tab (`CostDashboard.tsx`) im Essensplan-Detail wird erweitert:
  - Summary Cards: Gesamt, Pro Person, Pro Tag, Pro Person/Tag
  - Neue Sektion: Rezepte dieses Plans mit Einzelpreisen (durchsuchbar)
  - Tages-Tabelle mit Mahlzeiten-Breakdown (bestehend, beibehalten)
  - Hinweis/Link zur Zutaten-Preispflege (`/ingredients`)
  - Warnung bei unvollständiger Preisabdeckung (bestehend, beibehalten)
- `/cost-calculation`-Seite und Route wird entfernt (Funktionalität lebt jetzt im Kosten-Tab)
- Tool-Eintrag für `cost-calculation` in `toolColors.ts` entfernen

## Capabilities

### New Capabilities

- `meal-plan-cost-detail`: Erweiterte Kostenansicht im Essensplan-Detail mit Rezept-Einzelpreisen, zusätzlichen Kennzahlen und Preispflege-Link

### Modified Capabilities

## Impact

- **Frontend**: `frontend-food/src/pages/planning/CostDashboard.tsx` wird umgebaut
- **API**: Möglicherweise neuer Endpunkt oder Erweiterung von `useMealPlanCosts()` um Rezept-Einzelpreise pro Plan zu liefern (prüfen ob Daten bereits vorhanden)
- **Schemas**: Eventuell Erweiterung des `MealPlanCosts`-Response-Schemas um Rezeptkosten-Array (Pydantic + Zod)
- **Betroffene Apps**: `planner` (Backend), `frontend-food` (Frontend)
- **Keine Migrations** erforderlich (rein UI-getrieben, ggf. Schema-Erweiterung der API-Response)
