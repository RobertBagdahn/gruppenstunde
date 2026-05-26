## Context

Die Rezept-Detailseite zeigt zahlreiche abgeleitete Daten (Nutri-Score, Nährwerte, Health-Hints, Improvements, LLM-Vorschläge, Gesamtpreis). Um Performance zu gewährleisten, sind diese auf drei Ebenen gecached:

1. **DB-Cache** — `Recipe.cached_*`-Felder werden via `recipe.services.recipe_checks.recalculate_recipe_cache` aktualisiert. Getriggert durch `post_save`/`post_delete` auf `RecipeItem` und `post_save` auf `Ingredient` in `backend/recipe/signals.py`.
2. **Django-Cache** — LLM-Zutat-Vorschläge in `backend/recipe/services/suggestion_service.py`, Key `recipe_suggestion:{recipe.id}:{hash(objective)}`, TTL 24h.
3. **Frontend-Query-Cache** — TanStack Query Keys in `frontend/src/api/recipes.ts` (`['recipe', id]`, `['recipe-items', id]`, `['recipe-hints', id, objective]`, `['recipe-nutri-score', id]`, `['recipe-nutrition-breakdown', id]`, `['recipe-nutri-improvements', id]`, Listen-Prefixes).

Aktuelle Lücken:

| Layer | Lücke | Symptom |
|-------|-------|---------|
| DB | `post_delete` für `Ingredient` fehlt | Nach Ingredient-Löschung bleibt `RecipeItem.ingredient` NULL, aber cached-Werte sind veraltet |
| DB | Keine Signale für `supply.Portion` save/delete | Admin ändert `Portion.weight_g` von 15g auf 12g → alle Rezepte mit dieser Portion stale |
| DB | Kein Signal für `supply.MeasuringUnit` save | Änderung von `quantity`-Faktor einer Messeinheit schlägt nicht durch |
| Django-Cache | LLM-Cache-Key enthält keinen Änderungs-Indikator | Nach Zutat-Änderung zeigt Vorschlag bis zu 24h Stale-Content |
| Frontend | Nur `['recipe', id]` und `['recipe-items', id]` werden bei RecipeItem-Mutation invalidiert | Abhängige Queries (hints, nutri-score, nutrition-breakdown, nutri-improvements) zeigen alte Werte bis F5 |

## Goals / Non-Goals

**Goals:**
- Nach jeder upstream Datenänderung (RecipeItem, Ingredient, Portion, MeasuringUnit) MUSS der DB-Cache innerhalb des gleichen Request-Zyklus konsistent sein.
- Der LLM-Suggestions-Cache darf nie veraltete Vorschläge liefern, wenn sich die relevanten Rezept-Daten geändert haben.
- Alle abhängigen Frontend-Queries einer Rezept-Detailseite werden nach einer Mutation zentral und vollständig invalidiert.
- Regressions-Tests decken die Invalidierungs-Pfade ab.

**Non-Goals:**
- Kein neues Feature „Tipp anwenden". Improvements/Hints bleiben read-only.
- Keine Schema-Änderungen (weder Pydantic noch Zod).
- Keine DB-Migrationen.
- Keine Async-Queue (Celery/Cloud Tasks). Synchrone Recalc bleibt wie bisher.
- Kein Bulk-Operations-Schutz (bulk_update/bulk_create auf RecipeItem wird heute nicht verwendet — wir dokumentieren das als „don't" in Signals-Kommentar, aber bauen keinen aktiven Guard).

## Decisions

### D1: Erweiterte Signale in `recipe/signals.py`

**Entscheidung**: Zusätzliche `@receiver`-Handler für `post_delete Ingredient`, `post_save/post_delete Portion`, `post_save MeasuringUnit`. Alle ermitteln betroffene Rezepte und rufen `recalculate_recipe_cache` pro Rezept synchron auf.

**Lookup-Queries:**
- Ingredient → `RecipeItem.filter(ingredient=instance)` ∪ `RecipeItem.filter(portion__ingredient=instance)` (bereits im bestehenden `invalidate_recipes_on_ingredient_change` vorhanden, wird wiederverwendet)
- Portion → `RecipeItem.filter(portion=instance)`
- MeasuringUnit → `RecipeItem.filter(portion__measuring_unit=instance)` ∪ `RecipeItem.filter(measuring_unit=instance)`

**Alternativen verworfen:**
- `cached_at = NULL` setzen und lazy neu berechnen: Entkoppelt Schreib- und Lesepfad, bricht aber Annahme, dass `cached_*` immer aktuell sind. Cockpit/Listen verlassen sich auf diese Felder ohne Refresh. Lazy wäre nur bei >100 betroffenen Rezepten wertvoll; aktuell nicht relevant.
- Celery-Task: Keine Task-Queue im Stack, Overkill.

### D2: LLM-Cache-Key-Versioning via `cached_at`

**Entscheidung**: Cache-Key erweitern zu `f"recipe_suggestion:{recipe.id}:{int(recipe.cached_at.timestamp())}:{hash(objective)}"`. Bei `cached_at = None` (unnormalisiertes Rezept) fällt der Timestamp-Anteil auf `"0"` zurück.

**Wirkung**: Bei jeder Recipe-Änderung setzt `recalculate_recipe_cache` `cached_at = timezone.now()`. Der alte Cache-Key wird nie wieder getroffen, der neue ist leer → LLM wird neu befragt. Alte Einträge räumt der TTL (24h) ab.

**Alternativen verworfen:**
- `cache.delete_pattern(f"recipe_suggestion:{id}:*")` im Signal: Backend-abhängig (funktioniert mit Redis-Backend, nicht mit LocMemCache, ohne extra Library nicht mit Memcached).
- Content-Hash der Zutaten: `cached_at` ist bereits das kanonische „Recipe-changed"-Signal und wird im gleichen Code-Pfad gesetzt. Keine zusätzliche Berechnung nötig.

### D3: Frontend-Invalidation-Helper

**Entscheidung**: Neue Funktion in `frontend/src/api/recipes.ts`:

```ts
export function invalidateRecipeData(
  queryClient: QueryClient,
  recipeId: number,
): void {
  queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe', 'slug'] });
  queryClient.invalidateQueries({ queryKey: ['recipe-items', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-hints', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-nutri-score', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-nutrition-breakdown', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-nutri-improvements', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipes'] });
  queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
}
```

Ersetzt in allen relevanten Mutation-`onSuccess`-Hooks die einzelnen `invalidateQueries`-Aufrufe (`useCreateRecipeItem`, `useUpdateRecipeItem`, `useDeleteRecipeItem`, `useUpdateRecipe`, Hint-/Nutri-Improvement-Mutationen, Fork-Mutationen).

**Alternativen verworfen:**
- Ein einziger Parent-Key (`['recipe', id]`) mit Sub-Queries: Würde breites Refactoring der bestehenden Keys erfordern; risikobehaftet.
- Query-Invalidation via WebSocket/Server-Push: Overkill für diesen Bug-Fix.

### D4: Tests

**Entscheidung**: `backend/recipe/tests/test_cache_signals.py` wird um neue Szenarien erweitert:
- Ingredient-Löschung invalidiert Cache der nutzenden Rezepte.
- Portion-Save mit geändertem `weight_g` invalidiert Cache.
- MeasuringUnit-Save mit geändertem `quantity` invalidiert Cache.
- LLM-Cache-Key enthält `cached_at`-Timestamp (Unit-Test auf die Key-Bildung, kein echter Gemini-Call).

Frontend: Unit-Test für `invalidateRecipeData` (mock QueryClient, prüfen dass alle Keys invalidiert werden).

## Risks / Trade-offs

- **[Risiko] Signal-Sturm bei Bulk-Admin-Operationen** → Mitigation: Kommentar im Signal-Modul, der auf lazy-Strategie ab >100 betroffenen Rezepten hinweist. Für heute synchron akzeptabel.
- **[Risiko] Race Condition: parallele Requests während Recalc** → Mitigation: `cached_at` ist monoton steigend; schlimmstenfalls doppelte LLM-Anfrage, nie falsche Daten.
- **[Risiko] Vergessene Mutation-Hooks beim Frontend-Refactor** → Mitigation: Code-Search nach `queryClient.invalidateQueries` in `api/recipes.ts`, alle Treffer in einem PR konsolidieren; Reviewer prüft gegen die Mutation-Liste in tasks.md.
- **[Trade-off] Frontend-Helper invalidiert mehr Keys als strikt nötig** → Akzeptiert: Korrektheit > optionale Refetch-Einsparung. Listen-Queries (`['recipes']`) sind ohnehin stale-while-revalidate und führen nicht zu UX-Flackern.
- **[Trade-off] TTL-basiertes Cleanup alter LLM-Cache-Einträge** → Für bis zu 24h liegen unerreichbare Einträge im Cache. Vernachlässigbar (kleine Payload, automatische Expiry).

## Migration Plan

- Keine Datenmigration nötig. Bestehende `cached_at`-Werte bleiben gültig.
- Deployment: Backend zuerst (Signals + Suggestion-Cache-Key), Frontend danach. Kein Breaking Change in API-Verträgen.
- Rollback: Revert der drei betroffenen Dateien (`signals.py`, `suggestion_service.py`, `api/recipes.ts`) ist risikofrei — keine DB-Seiten-Effekte.
