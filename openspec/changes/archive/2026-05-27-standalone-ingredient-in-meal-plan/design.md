## Context

Der Essensplaner (`planner` App) erlaubt aktuell nur Rezepte als MealPlanItems. Viele Lebensmittel (Obst, Getränke, Süßigkeiten) werden roh konsumiert und brauchen kein Rezept. Das Ingredient-Model hat bereits `nutritional_tags` und `Portion`-Einträge – es fehlt nur die Markierung als "eigenständig konsumierbar" und die Verknüpfung zum MealPlan.

**Betroffene Dateien:**
- `backend/supply/models/ingredient.py` – neue Felder
- `backend/planner/models/` – MealPlanItem erweitern
- `backend/planner/api/meal_plan.py` – Search-Endpoint
- `backend/planner/schemas/` – Response-Schemas
- `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` – UI
- `frontend-food/src/api/mealPlans.ts` – API-Hook

## Goals / Non-Goals

**Goals:**
- Zutaten mit `is_standalone_food=True` direkt in MealPlans einfügen
- Unified Search: Ein Endpoint liefert Rezepte UND standalone Ingredients
- Mengenauswahl über existierende Portionen bei Zutat-Auswahl

**Non-Goals:**
- Keine neue Zutat-Erstellungs-UI (Zutaten werden im Admin/Supply-Bereich gepflegt)
- Kein eigenes Nährwert-Cockpit für standalone Ingredients (nutzt bestehende Ingredient-Daten)
- Keine Änderung am Einkaufslisten-Export (kommt separat)

## Decisions

### 1. Felder auf Ingredient statt separates Model

**Entscheidung:** `is_standalone_food: BooleanField` + `standalone_type: CharField(choices=RecipeTypeChoices)` direkt auf Ingredient.

**Alternativen:**
- Separates `StandaloneFood`-Model → Overhead, Daten-Duplizierung
- Flag auf Portion statt Ingredient → eine Zutat ist entweder standalone oder nicht, nicht portionsabhängig

**Rationale:** Minimal-invasiv, nutzt bestehende RecipeTypeChoices für konsistente Filterung.

### 2. MealPlanItem mit XOR-Constraint

**Entscheidung:** `ingredient` FK (nullable) + `portion` FK (nullable) + `quantity` DecimalField auf MealPlanItem. DB-Constraint: genau eins von `recipe` oder `ingredient` muss gesetzt sein.

```python
class Meta:
    constraints = [
        models.CheckConstraint(
            check=(
                Q(recipe__isnull=False, ingredient__isnull=True) |
                Q(recipe__isnull=True, ingredient__isnull=False)
            ),
            name="meal_plan_item_recipe_xor_ingredient"
        )
    ]
```

### 3. Unified Search Response (nicht polymorphe Liste)

**Entscheidung:** Response hat zwei getrennte Arrays statt einer gemischten Liste:

```json
{
  "recipes": [{"id": 1, "title": "...", "slug": "...", "recipe_type": "snack"}],
  "ingredients": [{"id": 1, "name": "...", "slug": "...", "standalone_type": "snack", "portions": [...]}]
}
```

**Rationale:** Typsicher, kein Discriminator nötig, Frontend kann Sections einfach rendern.

### 4. Portionen im Search-Response mitliefern

**Entscheidung:** Ingredient-Ergebnisse enthalten direkt `portions: [{id, name, measuring_unit, quantity, weight_g}]`, damit der Mengen-Dialog keine weitere API-Anfrage braucht.

**Rationale:** Portionen sind wenige pro Zutat (1-5), kein Performance-Problem. Spart einen Roundtrip.

### 5. API-Endpoint: bestehenden erweitern

**Entscheidung:** `GET /api/meal-plans/recipes/search/` wird erweitert (nicht neuer Endpoint).

**API-Änderung:**
- Request: unverändert (`q`, `recipe_type`, `nutritional_tag_ids`, `limit`)
- Response: von `list[dict]` zu `{recipes: [...], ingredients: [...]}`

**BREAKING:** Ja, Response-Format ändert sich. Frontend wird gleichzeitig angepasst.

## Risks / Trade-offs

- **[Performance]** Zwei Queries (Recipes + Ingredients) statt einer → Mitigation: Beide Queries sind einfach, parallel ausführbar, limit pro Typ
- **[Daten-Qualität]** `is_standalone_food` muss manuell gepflegt werden → Mitigation: Default False, nur gezielt setzen bei Import/Admin
- **[UX]** Mengen-Dialog ist ein zusätzlicher Klick gegenüber Rezept-Auswahl → Mitigation: Unvermeidbar, da Menge relevant für Einkaufsliste/Nährwerte

## Migration

1. `supply` Migration: Neue Felder `is_standalone_food`, `standalone_type` (beide nullable/default)
2. `planner` Migration: Neue Felder `ingredient`, `portion`, `quantity` + CheckConstraint
3. Bestehende MealPlanItems bleiben unverändert (recipe ist weiterhin gesetzt)
4. Kein Daten-Backfill nötig (neue Zutaten werden manuell als standalone markiert)
