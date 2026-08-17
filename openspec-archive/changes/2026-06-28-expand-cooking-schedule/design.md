## Context

Der Kochplan-Endpoint (`GET /api/meal-plans/{id}/cooking-schedule/`) existiert und liefert eine chronologische Liste von Rezepten pro Tag. Aktuell fehlen Allergen-, Kosten-, Nährwert-Informationen sowie strukturierte Schritte. Das Frontend hat eine interaktive Seite (`CookingSchedulePage`) und eine einfache Print-Seite (`CookingSchedulePrintPage`).

Dieses Design erweitert den bestehenden Endpoint um die fehlenden Daten und baut zwei neue Frontend-Ansichten: ein Küchen-Dashboard (vertikale Timeline) und ein überarbeitetes Kochbuch-Layout (Print).

## Goals / Non-Goals

**Goals:**
- Erweiterung des CookingSchedule-Backend-Service um Allergene, Kosten, Nährwerte, strukturierte Schritte
- Neue interaktive Küchen-Dashboard-Seite mit vertikaler Timeline
- Überarbeitete Druckansicht mit Kochbuch-Layout, Seitenumbrüchen pro Rezept, Deckblatt
- Personenanzahl, Allergen-Warnungen, Kosten- und Nährwertanzeige in allen Ansichten
- Sync: Pydantic (Backend) ↔ Zod (Frontend) Schemas

**Non-Goals:**
- Kein serverseitiges PDF (bleibt bei Browser-Print)
- Keine Echtzeit-Features (WebSocket für Checklisten)
- Keine Timer-Integration
- Keine Änderungen am MealPlan/Meal-Datenmodell (keine Migration nötig)
- Kein Austausch der bestehenden CookingSchedulePage

## Decisions

### Decision 1: Backend-Erweiterung im bestehenden Service

Der `build_cooking_schedule`-Service in `planner/services/cooking_schedule_service.py` wird erweitert, nicht ersetzt. Die neuen Felder werden in die bestehenden Dataclasses eingebaut.

**Rationale**: Der Service prefetcht bereits alle nötigen Relationen (RecipeItems, Portions, Ingredients). Die zusätzlichen Daten (NutritionalTags, Nährwerte, Kosten) sind über diese Relationen erreichbar, ohne neue DB-Queries.

**Alternative**: Neuer separater Service → verworfen wegen doppelter Datenbankzugriffe.

### Decision 2: Schritt-Parsing im Backend

Der Service parst `recipe.description` (Markdown) in einzelne Schritte. Der existierende `parseRecipeSteps`-Parser in `frontend-food/src/lib/parseRecipeSteps.ts` wird als Python-Version ins Backend übernommen.

**Schema:**
```
StepOut:
  text: str        # Schritt-Text (Markdown)
  timer: int | None  # Optional: Minuten aus "[Timer: 20min]"-Annotation
```

**Rationale**: Die Druckansicht braucht strukturierte Schritte (nummerierte Liste). Das Parsing im Backend ist robuster als clientseitiges Parsen für Print.

### Decision 3: Allergen/NutritionalTag-Anreicherung im Service

Pro RecipeItem wird der Ingredient auf NutritionalTags geprüft, pro Recipe die M2M-nutritional_tags. Die Tags werden auf Item-Ebene aggregiert und dedupliziert.

```python
# Pseudocode:
item_tags = set()
for ri in recipe.recipe_items.all():
    if ri.portion and ri.portion.ingredient:
        item_tags.update(ri.portion.ingredient.nutritional_tags.all())
item_tags.update(recipe.nutritional_tags.all())
```

**Rationale**: Ein Rezept kann Tags direkt haben (z.B. "Vegetarisch") und über Zutaten (z.B. "Laktose" in Milch). Beide Quellen müssen sichtbar sein.

### Decision 4: Kosten/Nährwerte über existierende Helper

Die Kostenberechnung nutzt `compute_variant_cost` und `compute_variant_energy` aus `planner.services.variant_service`, exakt wie in `MealItemOut.resolve_energy_kcal` und `MealItemOut.resolve_cost_eur`.

**Rationale**: Konsistenz mit den existierenden Berechnungen im MealPlan-Detail. Keine neue Logik.

### Decision 5: Zwei separate Frontend-Seiten

- `CookingSchedulePage` (bestehend) bleibt als schnelle Übersicht
- `CookingScheduleKitchenPage` (neu) als interaktives Dashboard
- `CookingSchedulePrintPage` (komplett überarbeitet) als Kochbuch-Layout

**Rationale**: Unterschiedliche Anwendungsfälle (schnelle Übersicht vs. Küchen-Begleitung vs. Ausdruck) erfordern unterschiedliche Layouts. Eine einzige Seite würde keines der Szenarien optimal bedienen.

## Risks / Trade-offs

- **Seitenumbrüche im Print**: `page-break-before: always` funktioniert zuverlässig in modernen Browsern, aber die Länge der Rezeptkarten variiert. Sehr lange Rezepte könnten über die Seite ragen. → `break-inside: avoid` auf Rezeptkarten, ggf. `orphans/widows`-Regeln
- **Performance bei vielen Rezepten**: Ein 7-Tage-Lager mit 3 Mahlzeiten × 2 Rezepte = 42 Rezepte. Der Service macht N+1-Queries (pro RecipeItem ein Ingredient-Zugriff). → Prefetching bereits vorhanden, aber NutritionalTags kommen als weitere Prefetch-Relation dazu
- **Kosten/Nährwerte gecached**: Basieren auf `cached_price_total`, `cached_energy_total_kcal` etc. Wenn diese nicht aktuell sind, zeigen Kochplan und MealPlan-Detail unterschiedliche Werte. → Bestehendes Problem, keine Regression
