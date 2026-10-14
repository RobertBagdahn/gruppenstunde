## 1. Backend: Daten und Statistik

- [x] 1.1 `RecipeItem.source_quantity` (nullable Float wie `quantity`) + Migration; zusätzlich gesetzt beim Anlegen mit `input_servings` und in der KI-Rezepterstellung
- [x] 1.2 Model `IngredientQuantityStats` (gesamt + `by_recipe_type`) + Migration
- [x] 1.3 Service `supply/services/ingredient_quantity_stats.py` (Median/p90, je Rezept einmal, nur vertrauenswürdige Gewichte)
- [x] 1.4 Command `recalculate_ingredient_quantity_stats`; Neuberechnung nach Rezept-Freigabe für betroffene Zutaten

## 2. Backend: Prüfungen

- [x] 2.1 Service `recipe/services/quantity_outliers.py`: Ausreißer-Regel (Faktor 3/6, p90 × 1,5, 20-g-Untergrenze), Rezepttyp-Fallback, gebündeltes Laden
- [x] 2.2 Erkennung ungeteilter Zeilen (mit `source_quantity` und Heuristik, nur stückartige Portionen)
- [x] 2.3 `source_quantity` setzen in `import_chefkoch_urls`, `import_cooklang`, `normalize_recipe_servings`; Bericht über ungeteilte Zeilen
- [x] 2.4 Verdächtige Stückgewichte und Alias-Konflikte (in `ingredient_merge.py`)
- [x] 2.5 Plan-Check-Regel `_check_quantity_outliers` (effektive Menge mit Factor/Override, ein Alert je Mahlzeit und Zutat, Link zur Mengen-Ansicht)
- [x] 2.6 Command `check_recipe_quantities` (Bericht, `--csv`)

## 3. Backend: Schemas und API

- [x] 3.1 Pydantic `QuantityOutlierOut`, `RecipeQuantityOutlierOut`, `SuspiciousPortionOut`, `AliasConflictOut` + paginierte Varianten; `RecipeItemOut.quantity_outlier`; Plan-Check-Alert-Typ `quantity_outlier`
- [x] 3.2 Admin-Endpunkte `recipes/quantity-outliers/`, `recipes/undivided-lines/`, `ingredients/suspicious-portions/`, `ingredients/alias-conflicts/` (Staff, paginiert)
- [x] 3.3 Aktion „Kein Duplikat“ für Alias-Konflikte (ContentLink)

## 4. Backend: Tests

- [x] 4.1 Statistik, Ausreißer-Grenzfälle, Rezepttyp-Fallback, Mindeststichprobe
- [x] 4.2 Ungeteilte Zeilen; Import/Normalisierung setzen `source_quantity`
- [x] 4.3 Plan-Check mit Override/Factor; Rechte und Paginierung der Admin-Endpunkte (401/403)
- [x] 4.4 Regression-Fixture „Bundesrat 2026“ (Sweet Onion Sauce, Burger, Eisbergsalat, Zwiebel-Alias)
- [x] 4.5 `uv run python manage.py makemigrations --check`, `uv run pytest`

## 5. Frontend-Food

- [x] 5.1 Zod-Schemas synchron (`recipe.ts`, `dataQuality.ts`, `mealPlan.ts`)
- [x] 5.2 Hinweis „Auffällige Menge“ an Rezeptzeilen in Rezept-Detail und Editor (nur `can_edit`)
- [x] 5.3 Tabs „Auffällige Mengen“, „Ungeteilte Zeilen“ (`DataQualityRecipesPage`) und „Stückgewichte“, „Alias-Konflikte“ (`DataQualityIngredientsPage`) mit QuerySection, Pagination „Mehr laden“, Merge-Vorschau
- [x] 5.4 Plan-Check-Alert mit Link in die Mengen-Ansicht prüfen
- [x] 5.5 Vitest; Lint, Typecheck; Mobile-Check 320 px (Playwright gegen lokales Backend: Listen, Rezept-Badge, kein Überlauf)

## 6. Rollout

- [x] 6.1 Deploy (`f223e015`); `recalculate_ingredient_quantity_stats` auf Prod über den Scheduler (565 Zutaten)
- [x] 6.2 `check_recipe_quantities` auf Prod (Bericht) erstellt; Korrekturen nur nach Freigabe
- [x] 6.3 Täglichen Lauf eingerichtet (Tofu): Cloud Scheduler `ingredient-quantity-stats` 03:30 ruft `inspi-migrate` mit `recalculate_ingredient_quantity_stats` auf
