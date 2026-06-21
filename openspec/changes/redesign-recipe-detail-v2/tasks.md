## 1. Backend-Bugfixes (sofort deploybar, ohne Layout-Abhängigkeit)

- [x] 1.1 `recipe/management/commands/normalize_recipe_servings.py:50`: IndentationError beheben (Einrückung `help`/`add_arguments`)
- [x] 1.2 `recipe/api/recipes.py`: `get_recipe` + `get_recipe_by_slug` über `_get_visible_recipes_qs(request)` filtern (404 statt Leak)
- [x] 1.3 `recipe/api/items.py`: `_can_edit_recipe` um `owner_id`-Check ergänzen / mit `recipes.py`-Variante vereinheitlichen
- [x] 1.4 `recipe/services/recipe_checks.py`: Gewicht/Preis-Cache an `get_recipe_total_weight_g` angleichen (beide Portion-Zweige)
- [x] 1.5 `recipe/signals.py`: Embedding-Update von `instance.tracker` auf `update_fields`-Vergleich umstellen; `dispatch_uid` für Recipe-`post_save`-Receiver setzen
- [x] 1.6 `recipe/api/recipes.py` `_update_like_score`: via `Recipe.objects.filter(pk=...).update(...)` (Signal-Kaskade vermeiden)
- [x] 1.7 `recipe/models/items.py`: CheckConstraint `quantity >= 0` → `quantity__gt=0` + Migration
- [x] 1.8 Tests: Sichtbarkeit Detail (404), Permission Items (owner), Cache-Gewicht (Mengeneinheit-Portion), Embedding-Update bei Save

## 2. RecipeTypeStats neu aufbauen (mit Histogramm-Buckets)

- [x] 2.1 `recipe/models/type_stats.py`: `RecipeTypeStats`-Model neu anlegen — min/max/avg/median (price/energy/protein), `nutri_score_dist`, Bucket-JSONFields (price/energy/protein) + Re-Export in `recipe/models/__init__.py`
- [x] 2.2 Migration: `uv run python manage.py makemigrations recipe`
- [x] 2.3 `recipe/services/type_stats_service.py`: `ContentStatus.APPROVED` verwenden; Buckets (Standard 12) je Metrik aus min/max berechnen; aktuelles Rezept exkludieren; Mindestanzahl 10
- [x] 2.4 `recipe/signals.py`: Recalc bei Recipe create/update/delete pro `recipe_type` (mit `dispatch_uid`)
- [x] 2.5 `recipe/schemas/type_stats.py`: `RecipeTypeStatsOut` um Bucket-Arrays erweitern
- [x] 2.6 `recipe/api/type_stats.py`: Endpunkt `GET /api/recipes/type-stats/{recipe_type}/` (öffentlich, nicht paginiert) liefert Buckets
- [x] 2.7 Initiale Befüllung: Recalc über alle `recipe_type`-Werte
- [x] 2.8 Tests: Aggregation, Buckets, Mindestanzahl, Cache-Invalidierung, Endpunkt (öffentlich + leer)

## 3. "In X Essensplänen verwendet"

- [x] 3.1 Backend: read-only Zähler/Liste via `MealItem.recipe` reverse-query, nur für Nutzer sichtbare MealPlans
- [x] 3.2 Schema: Feld/Endpoint in `RecipeDetailOut` bzw. eigener Endpunkt + Pydantic-Schema
- [x] 3.3 Tests: Zählung respektiert Sichtbarkeit

## 4. Frontend-Schemas synchronisieren (Zod ↔ Pydantic)

- [x] 4.1 `schemas/recipe.ts`: `RecipeTypeStatsSchema` mit Bucket-Arrays (Match zu Pydantic)
- [x] 4.2 `schemas/recipe.ts`: `RecipeDetailSchema` um neue Felder (Verwendung in Plänen, forked_from, Datenqualität, Daten) prüfen/ergänzen
- [x] 4.3 `schemas/supply.ts`: `NUTRI_SCORE_COLORS`/`NUTRI_SCORE_COLORS_BY_LETTER` zentralisieren (Token-basiert)
- [x] 4.4 `api/recipes.ts`: `useRecipeTypeStats(recipeType)` Hook; `invalidateRecipeData` Keys korrigieren (recipe-improvements, recipe-rules, recipe-comments, recipe-similar, recipe-type-stats)

## 5. Frontend-Bugfixes

- [ ] 5.1 `RecipeBadge.tsx`: `BADGE_CONFIG.personal` ergänzen + Union-Type erweitern; `RecipeDetailPage.tsx:414` Cast anpassen
- [x] 5.2 `RecipeDetailPage.tsx`: Modifikations-Save — Items ohne `portion_id` filtern; `portions`-Feld aus Payloads entfernen (fork + update)
- [x] 5.3 `EditRecipePage.tsx`: irreführendes Portions-Feld entfernen bzw. nur Anzeige; kein `portions` im Payload
- [x] 5.4 `RecipeDetailPage.tsx:303`: Kochmodus erhält Multiplikator `portions / (recipe.portions ?? 1)` statt absoluten Zähler
- [x] 5.5 `PortionScaler.tsx`: vollständig kontrolliert (`value`/`onChange`), kein interner `useState`-Init
- [x] 5.6 `RecipeSidebar.tsx` + `RecipeMobileActionBar.tsx`: Kochmodus via `navigate`/`setSearchParams` statt `window.location.href`
- [x] 5.7 Toten Code entfernen: `ScaleIngredientsDialog.tsx`, `store.scaleByFactor`, `scaleQuantity`
- [x] 5.8 Store/Helpers: `servings`→`portions` Benennung vereinheitlichen; doppelte `effectivePortions`-Berechnung entfernen

## 6. Layout-Redesign

- [ ] 6.1 `RecipeSidebar.tsx`: reichhaltige Metadaten-Karte (Typ-Badge oben, Kosten, Nutri-Score, Status, Autor-Link, Kategorie-Link, Zeiten, Schwierigkeit, Altersgruppe, Aufrufe/Likes, Datenqualität, Daten) + Aktions-Block (Kochen, Einkaufsliste, Portionen, Drucken, Teilen, Clonen)
- [ ] 6.2 `RecipeDetailPage.tsx`: Header = Titel + kompakte kleine Summary + Bearbeiten/Löschen rechts; Typ-Badge aus Header entfernen
- [ ] 6.3 Bild-Placeholder: kleiner dezenter Icon-Placeholder statt großem Fallback bei fehlendem Bild
- [ ] 6.4 Zubereitung-Sektion `defaultOpen=false`
- [ ] 6.5 Sektions-Reihenfolge gemäß Spec umordnen; `ContentAuthorSection` entfernen
- [ ] 6.6 Zwei-spaltige Portion-Anzeige (pro Portion / gesamt × n) in Zutaten + Nährwerten (mobil gestapelt)
- [ ] 6.7 Hartcodierte Farben → semantische Token (PortionScaler, NutritionTab, HealthTab, PriceTab, WeightTab, RecipeBadge, RecipeMetaCard, RecipeSidebar, InlineIngredientEditor u.a.); Abgleich mit `/styleguide`

## 7. Analyse-Histogramme

- [ ] 7.1 `RecipeHistogram.tsx` (NEU): Recharts-Histogramm mit markierter Rezept-Position
- [ ] 7.2 `RecipeCategoryBenchmark.tsx`: simplen min→max-Balken durch Histogramm ersetzen; neutrale Perzentil-Aussage
- [ ] 7.3 `PriceTab.tsx`: Preis/Portion-Histogramm (≥10 Rezepte)
- [ ] 7.4 `NutritionTab.tsx`: Kalorien/Portion + Protein/Portion Histogramme (≥10 Rezepte)
- [ ] 7.5 `HealthTab.tsx`: Nutri-Score-Verteilung beibehalten/verbessern (Token-Farben)

## 8. Zusatz-Features

- [ ] 8.1 `NutritionBigTable.tsx` (NEU): pro 100g + pro Portion + Gesamt (× n) + DGE-%
- [ ] 8.2 `AllergenIndicator.tsx` (NEU): Ampel aus `NutritionalTag.is_dangerous`, klickbar
- [ ] 8.3 Kosten-Aufschlüsselung: pro Zutat auf `/ingredients/{slug}` verlinken (entity-link)
- [ ] 8.4 `RecipeUsageInMealPlans.tsx` (NEU): "In X Essensplänen verwendet" + Links
- [ ] 8.5 `SeasonalityBar.tsx` (NEU): Jahres-Leiste aus `Ingredient.season_start/end`
- [ ] 8.6 Versions-/Änderungshinweis: "zuletzt aktualisiert" + Fork-Basis verlinkt
- [ ] 8.7 `RecipeTOC.tsx` (NEU): sticky Sprung-Navigation (Desktop)

## 9. Verifikation

- [ ] 9.1 `uv run pytest recipe/tests/ -x -v`
- [ ] 9.2 `uv run pytest supply/tests/test_shopping_service.py -x -v`
- [ ] 9.3 `npm run build` in `frontend-food/` erfolgreich
- [ ] 9.4 Visueller Check: persönliches Rezept ohne Crash, Sidebar-Metadaten, Histogramme (≥10), zwei-spaltige Portionen, Bild-Placeholder, default geschlossene Zubereitung
- [ ] 9.5 `openspec validate redesign-recipe-detail-v2 --strict`
