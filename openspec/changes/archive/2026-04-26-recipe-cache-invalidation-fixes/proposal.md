## Why

Rezepte verwenden denormalisierte Cache-Felder (`cached_energy_kj`, `cached_nutri_class`, `cached_price_total`, `cached_at` usw.), einen Django-Cache für LLM-basierte Zutat-Vorschläge (TTL 24h) und einen Frontend-Query-Cache für Nährwert-/Hint-/Improvement-Endpoints. Aktuell werden nicht alle drei Layer konsistent invalidiert, wenn upstream Daten sich ändern. Folge: User sehen veraltete Nutri-Scores, Nährwert-Breakdowns, Hints oder LLM-Vorschläge, bis manuell neu geladen wird oder der TTL abläuft.

## What Changes

- **Backend Signals**: Erweitere `recipe/signals.py` um `post_delete` für `Ingredient`, sowie `post_save`/`post_delete` für `supply.Portion` und `post_save` für `supply.MeasuringUnit`. Alle triggern `recalculate_recipe_cache` für betroffene Rezepte.
- **LLM-Suggestion-Cache**: Cache-Key in `recipe/services/suggestion_service.py` um `recipe.cached_at`-Timestamp erweitern, damit Zutat-Änderungen den Cache automatisch entwerten.
- **Frontend-Invalidation-Helper**: Neue Helper-Funktion `invalidateRecipeData(queryClient, recipeId)` in `frontend/src/api/recipes.ts`, die alle abhängigen Query-Keys (recipe, recipe-items, recipe-hints, recipe-nutri-score, recipe-nutrition-breakdown, recipe-nutri-improvements, recipes-Listen) invalidiert. Alle RecipeItem- und Recipe-Mutationen nutzen diesen Helper.
- **Kein** neues Feature, keine API-Schema-Änderungen, keine Pydantic/Zod-Sync-Arbeiten.

## Capabilities

### New Capabilities
<!-- keine -->

### Modified Capabilities
- `recipe`: Requirement ergänzen, dass Recipe-Cache-Felder und abgeleitete Daten (Hints, Improvements, Nutri-Score, Nutrition-Breakdown, LLM-Suggestions, Frontend-Query-Cache) nach jeder upstream Änderung innerhalb eines Request-Zyklus aktuelle Werte widerspiegeln müssen.

## Impact

- **Backend-App**: `recipe` (signals.py, services/suggestion_service.py), `supply` (keine Model-Änderungen, nur als Signal-Sender referenziert).
- **Frontend**: `frontend/src/api/recipes.ts` (neuer Helper, Refactor von ca. 10 Mutation-onSuccess-Hooks).
- **Migrations**: Keine — nur Signal- und Service-Änderungen.
- **Pydantic/Zod-Schemas**: Keine Änderungen.
- **Tests**: Neue Tests in `recipe/tests/test_cache_signals.py` für die erweiterten Signale; Frontend-Tests für den Invalidation-Helper.
- **Performance-Hinweis**: Ingredient/Portion/MeasuringUnit-Änderungen können viele Rezepte gleichzeitig neu berechnen. Bleibt synchron wie bisher; Dokumentation ergänzt den Hinweis, bei > 100 betroffenen Rezepten auf lazy `cached_at = NULL`-Strategie umzustellen.
