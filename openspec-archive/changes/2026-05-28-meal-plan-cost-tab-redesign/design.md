## Context

Der Kosten-Tab im Essensplan-Detail (`CostDashboard.tsx`) zeigt Summary Cards + Tages-Tabelle. Die separate `/cost-calculation`-Seite bietet zusätzlich Rezept-Einzelpreise und "Pro Person/Tag"-Kennzahlen. Ziel: Den Kosten-Tab zum "Best of Both" machen, nur für den aktuellen Plan.

**Betroffene Dateien:**
- `backend/planner/api/meal_plan.py` (Zeile 454–549): `cost_summary` Endpunkt
- `backend/planner/schemas/meal_plan.py` (Zeile 280–286): `MealPlanCostSummaryOut`
- `frontend-food/src/pages/planning/CostDashboard.tsx`: UI-Komponente
- `frontend-food/src/api/mealPlans.ts`: `useMealPlanCosts()` Hook
- `frontend-food/src/schemas/mealPlan.ts`: Zod-Schema für Cost-Response

## Goals / Non-Goals

**Goals:**
- Rezept-Einzelpreise im Kosten-Tab anzeigen (welches Rezept kostet wie viel im Kontext dieses Plans)
- "Pro Person pro Tag"-Kennzahl ergänzen
- Link zur Zutaten-Preispflege (`/ingredients`) einbauen
- Bestehendes beibehalten: Tages-Tabelle, Mahlzeiten-Breakdown, Incomplete-Warnung

**Non-Goals:**
- Übergreifende Kosten über mehrere Pläne (bleibt auf `/cost-calculation`)
- Frühstücks-Sektion (Platzhalter, irrelevant für Einzelplan)
- Suchfunktion (bei wenigen Rezepten pro Plan unnötig)

## Decisions

### 1. API-Erweiterung: Recipe-Costs im Response ergänzen

Die API iteriert bereits über Rezepte pro Meal, aggregiert aber nur auf Meal-Ebene. Erweiterung: Ein zusätzliches `recipes`-Feld im Response mit Kosten pro Rezept.

**Warum nicht Frontend-only?** Die Rezept-Kosten im Plan-Kontext sind skaliert (Portionen, Faktor) — das berechnet bereits das Backend. `cached_price_total` auf dem Recipe-Model ist der unscaled Preis für `recipe.servings`.

**Schema-Erweiterung:**
```python
class RecipeCostOut(Schema):
    recipe_id: int
    recipe_title: str
    recipe_slug: str
    total_cost: Decimal       # skaliert auf Plan-Portionen
    cost_per_person: Decimal
    servings_in_plan: int     # effektive Portionen im Plan

class MealPlanCostSummaryOut(Schema):
    # bestehende Felder...
    total_cost: Decimal
    cost_per_person: Decimal
    norm_portions: int
    total_ingredients: int
    priced_ingredients: int
    days: list[DayCostOut] = []
    # NEU:
    recipes: list[RecipeCostOut] = []
```

**Alternative verworfen:** Separater Endpunkt für Rezeptkosten — unnötige Komplexität, Daten werden ohnehin im selben Loop berechnet.

### 2. Frontend: CostDashboard.tsx erweitern, nicht ersetzen

Das bestehende Layout wird ergänzt:
1. Summary Cards → +1 Card "Pro Pers./Tag"
2. Neue Sektion: Rezeptkosten-Liste (Cards mit Link zum Rezept)
3. Bestehende Tages-Tabelle bleibt
4. Neuer Footer: Hinweis-Banner mit Link zu `/ingredients`

### 3. Keine DB-Migration nötig

Reine API-Response-Erweiterung + Frontend-UI-Änderung.

## Risks / Trade-offs

- **Performance**: Die API berechnet bereits alles in einem Loop. Recipe-Aggregation ist O(meals × recipe_items) — bei typischen Plänen (5–14 Tage, 3 Mahlzeiten) vernachlässigbar.
- **Duplikate**: Ein Rezept kann mehrfach im Plan vorkommen (z.B. "Nudeln mit Soße" an Tag 1 und Tag 3). → Kosten werden pro Rezept summiert über alle Vorkommen.
