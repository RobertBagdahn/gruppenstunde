## Context

Die MealPlan-Detailseite hat bereits ein Tab-System mit 4 Tabs (Tagesplan, Nährwerte, Einkaufsliste, Cockpit). Preisdaten existieren auf `Ingredient.price_per_kg` und `Recipe.cached_price_total`. Die Mahlzeiten sind nach Tagen gruppierbar über `Meal.start_datetime`. Es fehlt: eine kompakte Grid-Übersicht und aggregierte Kostenberechnung.

## Goals / Non-Goals

**Goals:**
- Tabellarische Übersicht (Tage × Mahlzeittypen) als zusätzlicher Tab
- Kosten-Dashboard mit Aggregation pro Tag, pro Person, gesamt
- Backend-Endpoint für Kostenberechnung

**Non-Goals:**
- PDF-Export (spätere Iteration)
- Plots/Diagramme (spätere Iteration)
- +/- Tag/Woche Funktionalität (explizit ausgeschlossen)
- Änderung der bestehenden Tabs

## Decisions

### 1. Kostenberechnung: Server-seitig

**Entscheidung**: Dedicated API-Endpoint `/api/planner/meal-plans/{id}/costs/`

**Warum**: Die Berechnung benötigt Joins über MealItem → Recipe → RecipeItem → Ingredient. Client-seitig wäre das zu viele Requests. Der Endpoint aggregiert und liefert fertige Summen.

**Alternative verworfen**: Client-seitige Berechnung aus bestehenden Daten — zu komplex, da `price_per_kg` mit Mengen und Faktoren verrechnet werden muss.

### 2. Kosten-Formel

```
item_cost = ingredient.price_per_kg * (quantity_in_kg) * meal_item.factor
meal_cost = sum(item_costs) * effective_portions / recipe.servings
day_cost = sum(meal_costs_for_day)
cost_per_person = total_cost / norm_portions
```

`effective_portions` = `meal.override_portions` oder `meal_plan.norm_portions`

### 3. Tabellenansicht: Reine Frontend-Komponente

**Entscheidung**: Nutzt die bestehenden Meal-Daten aus dem MealPlan-Detail-Query. Kein neuer Endpoint nötig.

**Warum**: Die Daten (Meals mit `start_datetime`, `meal_type`, Items) kommen bereits im Detail-Response. Die Tabelle ist nur eine andere Darstellung.

### 4. Tab-Integration

Neue Tabs werden ins bestehende Tab-Array eingefügt:
```
['plan', 'table', 'nutrition', 'costs', 'shopping', 'cockpit']
```

## API-Änderungen

### Neuer Endpoint

```
GET /api/planner/meal-plans/{id}/costs/
```

**Response-Schema** (`MealPlanCostSummarySchema`):
```python
class MealCostSchema(Schema):
    meal_id: int
    meal_type: str
    date: date
    cost: Decimal  # Gesamtkosten dieser Mahlzeit (skaliert auf Portionen)
    cost_per_person: Decimal

class DayCostSchema(Schema):
    date: date
    total_cost: Decimal
    cost_per_person: Decimal
    meals: list[MealCostSchema]

class MealPlanCostSummarySchema(Schema):
    total_cost: Decimal
    cost_per_person: Decimal
    norm_portions: int
    days: list[DayCostSchema]
```

## Betroffene Dateien

- `backend/planner/schemas/meal_plan.py` — Neue Cost-Schemas
- `backend/planner/api/meal_plan.py` — Neuer Costs-Endpoint
- `frontend-food/src/schemas/mealPlan.ts` — Zod Cost-Schemas
- `frontend-food/src/api/mealPlans.ts` — API-Client-Funktion
- `frontend-food/src/pages/planning/MealPlanDetailPage.tsx` — Tab-Erweiterung
- `frontend-food/src/pages/planning/components/TableView.tsx` — Neue Komponente
- `frontend-food/src/pages/planning/components/CostDashboard.tsx` — Neue Komponente

## Risks / Trade-offs

- **[Fehlende Preise]** → Nicht alle Zutaten haben `price_per_kg`. Mitigation: Items ohne Preis als "unbekannt" markieren, Gesamtsumme als "geschätzt (X von Y Zutaten mit Preis)" anzeigen.
- **[Performance]** → Kostenberechnung über viele Joins. Mitigation: Für typische Lagerpläne (7-14 Tage, ~30 Meals) kein Problem. Bei Bedarf cachen.
- **Keine Migrationen nötig.**
