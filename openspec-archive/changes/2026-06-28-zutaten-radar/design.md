## Context

Der aktuelle Allergen-Scan (`GET /api/meal-plans/{id}/allergen-scan/`) prüft, ob Rezepte im MealPlan NutritionalTags enthalten, die auch auf dem MealPlan als Einschränkung markiert sind. Das hat zwei Lücken:

1. **Nur Recipe-Level Tags**: Die Scanlogik prüft `recipe.nutritional_tags`. Zutaten (Ingredients) haben aber eigene `nutritional_tags`, die nicht in den Scan einfließen. Ein Rezept ohne manuellen Tag "nussfrei", das aber Nüsse als Zutat enthält, wird nicht erkannt.
2. **Nur `is_dangerous=True` gesynct**: Der bestehende `sync_recipe_allergen_tags` überträgt nur gefährliche Tags (Allergene) von Ingredient → Recipe. Nicht-dangeröse Tags wie "vegan" werden nicht gesynct.

Der Sync läuft über Django-Signale (`post_save`/`post_delete` auf RecipeItem und Recipe).

Zusätzlich kann ein MealItem sowohl ein Recipe (via `recipe` FK) als auch eine Standalone-Zutat (via `ingredient` FK) referenzieren — letztere wird aktuell komplett ignoriert.

## Goals / Non-Goals

**Goals:**
- Alle NutritionalTags (nicht nur `is_dangerous=True`) von Ingredient → Recipe syncen
- Sync als Erweiterung des bestehenden Signal-basierten Mechanismus (synchron)
- Deep Scan: Scan prüft Recipe-Tags (nach vollständigem Sync) + Standalone-Ingredient-Tags
- API und Frontend-Komponenten von "Allergen" auf "Ingredient"/"Zutaten" umbenennen
- Backfill-Befehl für bestehende Rezepte
- Bestehende manuelle Recipe-Tags bleiben erhalten (werden ergänzt, nicht ersetzt)

**Non-Goals:**
- Kein asynchroner Task-Queue (bleibt synchron)
- Keine Änderungen am Datenmodell (keine Migration nötig)
- Keine Änderungen am Content-Tag-System (`content.Tag`)

## Decisions

### Sync-Erweiterung (alle Tags, nicht nur dangerous)

**Entscheidung:** `sync_recipe_allergen_tags` → `sync_recipe_nutritional_tags`

Die neue Funktion übernimmt **alle** NutritionalTags von den Ingredients eines Rezepts, nicht nur `is_dangerous=True`. Nicht-dangeröse Tags, die manuell auf dem Rezept gesetzt wurden (z.B. "vegan"), bleiben erhalten.

```
Bisher:
  non_dangerous_tags = recipe.nutritional_tags.filter(is_dangerous=False)  ← bewahren
  dangerous_tags = Ingredient.nutritional_tags.filter(is_dangerous=True)   ← von Zutaten
  recipe.nutritional_tags.set(non_dangerous_tags + dangerous_tags)

Neu:
  non_dangerous_tags = recipe.nutritional_tags.filter(is_dangerous=False)   ← bewahren
  all_ingredient_tags = Ingredient.nutritional_tags.filter(                  ← ALLE von Zutaten
    id__in=RecipeItem→Ingredient_ids
  )
  recipe.nutritional_tags.set(non_dangerous_tags + all_ingredient_tags)
```

### Scan-Tiefe (Deep Scan + Standalone)

**Entscheidung:** Scan prüft für jeden MealItem:

1. **Recipe-basiert** (`item.recipe`): `recipe.nutritional_tags` (nach vollständigem Sync → deckt alle Ingredient-Tags ab)
2. **Standalone Ingredient** (`item.ingredient`): `ingredient.nutritional_tags` direkt

```
scan(meal_plan):
  plan_tag_ids = meal_plan.nutritional_tags.all().ids
  violations = []

  for meal in meal_plan.meals:
    for item in meal.items:
      if item.recipe:
        tags = item.recipe.nutritional_tags.all()   # sync-aktuell
      elif item.ingredient:
        tags = item.ingredient.nutritional_tags.all() # direkt
      else:
        continue

      for tag in tags:
        if tag.id in plan_tag_ids:
          violations.append({...})
```

### Signale (synchron, wie heute)

**Entscheidung:** Die Signal-Handler bleiben synchron. Die neue `sync_recipe_nutritional_tags` ersetzt `sync_recipe_allergen_tags` in:

- `recipe/signals.py`: `sync_recipe_allergens_on_item_change` und `sync_recipe_allergens_on_recipe_change`

**Risiko:** Bei sehr großen Rezepten (50+ Items) kann der Sync spürbar sein. Da der Sync aber nur bei Save/Delete feuert (nicht bei Reads), ist das akzeptabel.

### Backfill

**Entscheidung:** Bestehendes `sync_recipe_allergen_tags` Management Command erweitern zu `sync_recipe_nutritional_tags`. Ruf `sync_recipe_nutritional_tags` für alle Rezepte auf.

- Flag `--dry-run` für Testdurchlauf
- Fortschrittsanzeige
- Idempotent

### Rename

**Entscheidung:** Vollständige Umbenennung:

| Alt | Neu |
|-----|-----|
| `AllergenScanView` | `IngredientScanView` |
| `AllergenIndicator` | `NutriTagIndicator` |
| `AllergenWarningBadge` | `NutriTagBadge` |
| `useAllergenScan` | `useIngredientScan` |
| `'meal-plan-allergen-scan'` | `'meal-plan-ingredient-scan'` |
| `GET .../allergen-scan/` | `GET .../ingredient-scan/` |
| UI "Allergene Radar" | UI "Zutaten-Radar" |
| UI "Allergenhinweise" | UI "Ernährungstags" |

## Risks / Trade-offs

- **Sync-Performance**: Bei Rezepten mit vielen Items kann der `set()`-Aufruf auf der M2M viele DB-Queries erzeugen. → Query-Count beobachten, ggf. mit `bulk_create`/`bulk_delete` optimieren.
- **Sync-Schleifen**: Recipe-Save triggert Sync, der wiederum Recipe.save triggert. → `_syncing_allergens`-Flag bleibt erhalten, verhindert Rekursion.
- **Backfill-Laufzeit**: Bei vielen Rezepten kann der Backfill Minuten dauern. → `--dry-run` für Test, batch-weises Vorgehen.
- **Stale Scan-Daten**: Kurze Inkonsistenz zwischen Ingredient-Änderung und Recipe-Sync → Durch synchrone Signale maximal einige Millisekunden.
