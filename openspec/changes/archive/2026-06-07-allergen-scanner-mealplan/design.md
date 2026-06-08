## Context

Aktuell gibt es im MealPlan-Modul keine Möglichkeit, Allergene zu konfigurieren und automatisch auf Verstöße zu prüfen. Rezepte und Zutaten haben bereits `nutritional_tags` (M2M zu `NutritionalTag`), wobei `is_dangerous=True` Allergene markiert (z. B. "Erdnüsse", "Gluten (Zöliakie)", "Milch"). Der Allergie-Scanner soll diese Tags auf MealPlan-Ebene nutzen, um:

1. MealPlan-spezifische Allergene zu definieren (M2M `allergen_tags`)
2. Bei jedem Rezept-Update die Allergene der Zutaten auf das Rezept zu synchronisieren
3. Einen Scanner-Endpunkt bereitzustellen, der alle Verstöße auflistet
4. Warnhinweise überall in der MealPlan-UI anzuzeigen

## Goals / Non-Goals

**Goals:**
- MealPlan kann beliebig viele Allergene (NutritionalTag mit is_dangerous) als Tags zuweisen
- Automatischer Sync: Recipe.nutritional_tags ← Union aller Ingredient.nutritional_tags (is_dangerous) der RecipeItems
- Scanner-API liefert strukturierte Verstöße: Meal → Recipe → Allergen-Tag + Source
- UI: Eigenes Tab "Allergie-Scanner" + rote Warn-Badges in allen bestehenden Tabs
- RecipeSearchDialog: Auto-Ausschluss der MealPlan-Allergene, 🚨-Badges auf verbleibenden Treffern
- Keine Breaking Changes an bestehenden APIs (nur additive Felder)

**Non-Goals:**
- Keine diätetischen Präferenzen (Vegan, Vegetarisch) — nur `is_dangerous` Allergene
- Keine pro-Meal Allergen-Überschreibungen (nur Plan-Ebene)
- Keine Spuren/„kann enthalten“-Logik (nur explizite Tags)
- Keine Allergen-Verwaltung im Frontend (Tags kommen aus Supply/Admin)

## Decisions

### 1. Datenmodell: M2M `allergen_tags` auf MealPlan
**Entscheidung:** Neues Feld `allergen_tags = models.ManyToManyField("supply.NutritionalTag", ...)` auf `MealPlan` mit `limit_choices_to={'is_dangerous': True}`.
**Begründung:** Einfachste Integration, nutzt bestehende Tag-Infrastruktur, Admin kann Allergene direkt zuweisen. Alternative (dediziertes Modell `MealPlanAllergen`) wäre Overhead ohne Mehrwert.

### 2. Rezept-Allergen-Sync: Signal-basiert auf RecipeItem/Recipe Save
**Entscheidung:** Django Signal `post_save` auf `RecipeItem` und `Recipe` → Service `sync_recipe_allergen_tags(recipe)` sammelt alle `is_dangerous` Tags der Zutaten (über `RecipeItem.portion.ingredient.nutritional_tags`) und setzt sie auf `recipe.nutritional_tags`.
**Begründung:** Automatisch, transparenter als manueller Sync. Signal auf RecipeItem deckt Zutatenänderungen ab, auf Recipe deckt manuelle Tag-Änderungen ab (idempotent: Union bleibt konsistent).

### 3. Scanner-API: Neuer Endpunkt `GET /api/meal-plans/{id}/allergen-scan/`
**Entscheidung:** Dedizierter Endpunkt statt Erweiterung von `/detail/`, da Scanner teure Joins braucht (Meal → MealItem → Recipe → NutritionalTag) und separat gecacht/aufgerufen wird.
**Response-Struktur:**
```json
{
  "allergen_tags": [{"id": 3, "name": "Erdnüsse"}, ...],
  "violations": [
    {
      "meal_id": 42,
      "meal_type": "lunch",
      "date": "2026-07-15",
      "recipe_id": 123,
      "recipe_title": "Satay-Sauce",
      "allergen_tag": {"id": 3, "name": "Erdnüsse"},
      "source": "recipe_tag"
    }
  ],
  "summary": {"total_violations": 5, "affected_meals": 3, "unique_allergens": 2}
}
```
**Begründung:** Frontend-Tab braucht genau diese Struktur. `source` aktuell nur `"recipe_tag"` (später erweiterbar für `ingredient_tag` falls direkte Zutaten hinzukommen).

### 4. Rezept-Suche: Auto-Filter via bestehendem `nutritional_tag_ids` Parameter
**Entscheidung:** Frontend übergibt beim Öffnen des RecipeSearchDialogs die `allergen_tag_ids` des MealPlans als `nutritional_tag_ids` (EXCLUDE-Logik im Backend: `exclude(nutritional_tags__in=allergen_ids)`).
**Begründung:** Backend-Suche unterstützt schon `nutritional_tag_ids` als Filter. Wir nutzen es als Ausschluss (NOT IN). Keine API-Änderung nötig, nur Frontend-Default.

### 5. UI: Warn-Badge Komponente + Scanner-Tab
**Entscheidung:** 
- `AllergenWarningBadge` (neue Komponente): Roter Kreis mit 🚨 + Tooltip "Enthält: Erdnüsse, Gluten"
- `AllergenScannerTab` (neue Page-Komponente): Tabelle gruppiert nach Allergen → Meals/Recipes
- Integration in bestehende Views via `meal_plan.allergen_tag_ids` (bereits im Detail geladen)

**Begründung:** Wiederverwendbar, konsistentes Design-System (shadcn/ui Badge + Tooltip), mobile-first.

### 6. Migration Strategy
**Entscheidung:** Einfache additive Migration:
1. `makemigrations planner` → erstellt M2M-Tabelle `planner_mealplan_allergen_tags`
2. Kein Data-Migration nötig (Feld optional, leer = keine Allergene)
3. Deployment: Backend + Frontend simultan (keine Breaking Changes)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Recipe-Sync vergisst Tags bei Bulk-Import/Management-Commands | Signal auf Model-Ebene + expliziter Aufruf in `recalculate_recipe_cache` / Import-Commands |
| Scanner-Performance bei großen MealPlans (viele Tage/Rezepte) | Endpunkt nutzt `prefetch_related` aggressiv; bei Bedarf Caching (Redis) oder Pagination hinzufügen |
| Frontend: RecipeSearchDialog zeigt trotzdem Rezepte mit Allergenen wenn User "Zeige trotzdem" klickt | Backend-Filter ist Default; Frontend-Toggle entfernt Filter — Server validiert nicht, nur UI-Warnung |
| Allergen-Tags im Admin nicht auf `is_dangerous` limitiert | `limit_choices_to` im Model + Admin-Form-Validierung |
| Bestehende Rezepte ohne Tags → falsch-negative Scanner-Ergebnisse | Einmaliger Backfill-Command `sync_all_recipe_allergen_tags` nach Deployment |

## Migration Plan

1. **Backend**: Model + Schema + API + Service + Signal + Migration
2. **Frontend**: Schemas + API-Hooks + Komponenten + Tab-Integration
3. **Deploy**: `uv run python manage.py migrate` → Frontend-Build → Cloud Run Deploy
4. **Backfill**: `uv run python manage.py sync_recipe_allergen_tags` (neuer Command)
5. **Rollback**: Migration rückgängig (`migrate planner 0021`), Frontend-Rollback

## Open Questions

- Soll der Scanner auch `MealItem.ingredient` (direkte Zutaten) prüfen? Aktuell: Nein (nur Rezepte). Später erweiterbar via `source: "ingredient_tag"`.
- Caching für Scanner-Endpunkt? Erst mal ohne, bei Performance-Problemen Redis-Cache mit 5min TTL.
- Tooltip-Text für Badge: Nur Allergen-Namen oder auch "Rezept: X, Zutat: Y"? → Start: nur Allergen-Namen (Platz).