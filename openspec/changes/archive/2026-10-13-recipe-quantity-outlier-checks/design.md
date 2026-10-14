# Design: Auffällige Zutatenmengen früh erkennen

## Entscheidungen

1. **Nur Warnungen.** Alle Prüfungen liefern Hinweise mit deutscher Begründung. Speichern, Import und Planung werden nie blockiert, weil Ausreißer auch gewollt sein können (Zwiebelsuppe, Salatteller).

2. **Grammbasis.** Verglichen werden Gramm pro Person aus `resolve_recipe_item_grams` (nur vertrauenswürdige Gewichte). Zeilen ohne vertrauenswürdiges Gewicht werden nicht bewertet. Rezeptmengen sind pro Person gespeichert (`portions = 1`), daher ist keine Teilung nötig.

3. **Statistik pro Zutat (`IngredientQuantityStats`).**
   - Felder: `ingredient` (OneToOne), `sample_count`, `median_g`, `p90_g`, `by_recipe_type` (JSON: `{recipe_type: {sample_count, median_g, p90_g}}`), `calculated_at`.
   - Stichprobe: Zeilen freigegebener, nicht gelöschter Rezepte; je Rezept zählt eine Zutat einmal (Summe ihrer Zeilen).
   - Berechnung über Command `recalculate_ingredient_quantity_stats` (täglich als Cloud-Run-Job) und zusätzlich nach dem Freigeben eines Rezepts für dessen Zutaten. Keine Neuberechnung bei jedem Speichern.
   - Vergleichswert: Werte des Rezepttyps, wenn dort mindestens 5 Stichproben vorliegen, sonst der Gesamtwert ab 5 Stichproben; darunter keine Bewertung.

4. **Ausreißer-Regel.** Eine Zeile ist auffällig, wenn `grams > max(3 × median_g, 1.5 × p90_g)` **und** `grams − median_g ≥ 20 g`. Die Untergrenze verhindert Meldungen bei Kleinstmengen (Gewürze). Stufen: `warning` ab der Regel, `danger` ab `6 × median_g`. Die Konstanten liegen zentral in `recipe/services/quantity_outliers.py`.

5. **Ungeteilte Zeilen erkennen.**
   - Neues Feld `RecipeItem.source_quantity` (nullable Decimal, gleiche Einheit wie `quantity`) speichert beim Teilen die Originalmenge.
   - Mit `source_quantity` und `source_servings > 1`: auffällig, wenn `quantity == source_quantity` (nicht geteilt).
   - Ohne `source_quantity` (Altdaten) gilt die Heuristik aus der Diagnose: Rezept mit `source_servings > 1`, Zeile mit **stückartiger Portion** (`is_piece_like_name`, z. B. „mittelgroße Zwiebel“, „Stück“) und ganzzahliger Anzahl ≥ 1 sowie ≥ 60 g, während mindestens zwei andere Stück-/Maß-Zeilen gebrochene Mengen haben. Portionen wie „1 Portion trocken (100g)“ sind natürliche Pro-Person-Einheiten und werden nicht bewertet (lokal sonst 6 Fehlalarme).
   - Import und `normalize_recipe_servings` geben gefundene Zeilen im Bericht aus.

6. **Plan-Check.** Die Regel `_check_quantity_outliers` bewertet jede aktive Rezeptzeile eines Mahlzeit-Eintrags mit ihrer effektiven Menge pro Person (inklusive `MealItemOverride` und `factor`) nach Entscheidung 4. Direkte Zutaten-Einträge werden ebenfalls bewertet. Pro Mahlzeit und Zutat höchstens ein Alert mit Severity `warning`, `action_type = "open_quantities"` und `action_payload = {"ingredient_name": …}`; der Plan-Check-Flyout navigiert zu `/meal-plans/{id}/shopping?sub=quantities&q=<Zutat>`. Ein Override, der eine Zeile unter die Schwelle bringt, beseitigt den Alert.

7. **Verdächtige Portionsgewichte.** Eine aktive Portion ist verdächtig, wenn sie stückartig benannt ist (`is_piece_like_name`) oder dem Import-Muster `1 Stück (<n>g)` entspricht, `weight_status` nicht `confirmed` ist, das Gewicht genau dem Import-Standard (150 g) entspricht **und** sie von mindestens einem Rezept oder Mahlzeit-Eintrag verwendet wird. Sortierung nach Anzahl der Verwendungen.

8. **Alias-Konflikte.** Ein Konflikt liegt vor, wenn der Name einer aktiven Zutat (ohne Groß-/Kleinschreibung) einem Alias einer anderen aktiven Zutat entspricht, oder wenn zwei Zutaten denselben Alias tragen. Die Liste bietet „Zusammenführen“ (vorhandener `IngredientMergeDialog`, die weniger genutzte Zutat geht in die meistgenutzte auf) und „Kein Duplikat“ (vorhandenes `DuplicateDismissal` über `POST /api/admin/data-quality/ingredients/duplicates/dismiss/`) an; abgelehnte und bereits zusammengeführte Paare erscheinen nicht mehr.

## API

Alle neuen Datenqualitäts-Endpunkte liegen unter `/api/admin/data-quality/`: `require_staff`, paginiert `{ items, total, page, page_size, total_pages }`, Standard `page=1`, `page_size=20` (10/20/50, andere Werte fallen auf 20 zurück). Das Frontend lädt mit „Mehr laden“ (`useInfiniteQuery`).

| Methode | Pfad | Response |
|---|---|---|
| GET | `/api/admin/data-quality/recipes/quantity-outliers/?severity=` | `PaginatedRecipeQuantityOutlierOut` |
| GET | `/api/admin/data-quality/recipes/undivided-lines/` | `PaginatedRecipeQuantityOutlierOut` (Grund `undivided`) |
| GET | `/api/admin/data-quality/ingredients/suspicious-portions/` | `PaginatedSuspiciousPortionOut` |
| GET | `/api/admin/data-quality/ingredients/alias-conflicts/` | `PaginatedAliasConflictOut` |

Schemas:

```
QuantityOutlierOut
  kind: Literal["high_quantity", "undivided"]
  severity: Literal["warning", "danger"]
  grams_per_person: float
  median_g: float | None
  p90_g: float | None
  sample_count: int
  message: str                      # z. B. "160 g pro Person – üblich sind 25 g"

RecipeQuantityOutlierOut
  recipe_id, recipe_title, recipe_slug, recipe_item_id, ingredient_id, ingredient_name,
  quantity: float, unit_label: str, outlier: QuantityOutlierOut

SuspiciousPortionOut
  portion_id, portion_name, weight_g, weight_status, ingredient_id, ingredient_name,
  ingredient_slug, recipe_count: int, meal_item_count: int

AliasConflictOut
  kind: Literal["name_is_alias", "shared_alias"], alias: str,
  ingredient_id, ingredient_name, ingredient_slug, ingredient_usage,
  conflicting_ingredient_id, conflicting_ingredient_name, conflicting_ingredient_slug, conflicting_ingredient_usage
```

`RecipeItemOut` erhält `quantity_outlier: QuantityOutlierOut | None = None`. Der Wert wird in Rezept-Detail und Editor nur für Nutzer mit `can_edit` angezeigt; öffentlich bleibt die API-Ausgabe gleich, das Frontend blendet den Hinweis ohne Bearbeitungsrecht aus. Das Laden der Statistik erfolgt gebündelt pro Rezept (eine Query für alle Zutaten).

Plan-Check: neuer Alert-Typ `quantity_outlier` (Severity `warning`) in `PlanCheckAlertOut`; Zod-Enum in `frontend-food/src/schemas/mealPlan.ts` ergänzen.

## Migrationen

- `recipe`: `RecipeItem.source_quantity = FloatField(null=True, blank=True)` (gleicher Typ wie `quantity`), Migration `recipe.0015_recipe_item_source_quantity`.
- `supply`: Model `IngredientQuantityStats`, Migration `supply.0023_ingredient_quantity_stats`.
- Nach Deploy: `recalculate_ingredient_quantity_stats` einmal ausführen (nur Statistik, keine Datenänderung an Rezepten).

## Betroffene Dateien

- `backend/recipe/models/items.py`, `backend/recipe/schemas/items.py`, `backend/recipe/services/{quantity_outliers,quantity_report}.py` (neu), `backend/recipe/api/recipes.py` (`input_servings`), `backend/recipe/services/recipe_ai_suggest_service.py`, `backend/recipe/management/commands/{import_chefkoch_urls,import_cooklang,normalize_recipe_servings,check_recipe_quantities}.py`, `backend/content/services/approval_service.py`
- `backend/supply/models/ingredient_quantity_stats.py` (neu), `backend/supply/services/ingredient_quantity_stats.py` (neu), `backend/supply/management/commands/recalculate_ingredient_quantity_stats.py` (neu), `backend/supply/services/ingredient_merge.py`
- `backend/planner/services/plan_check.py`, `backend/planner/schemas/meal_plan.py`
- `backend/content/api/data_quality.py`, zugehörige Schemas
- `frontend-food/src/schemas/{recipe,dataQuality,mealPlan,listState}.ts`, `frontend-food/src/api/dataQuality.ts`, `frontend-food/src/components/recipe/QuantityOutlierBadge.tsx` (neu), `frontend-food/src/components/supply/IngredientList.tsx` (Prop `showQuantityOutliers`), `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`, `frontend-food/src/components/planning/PlanCheckFlyout.tsx`, `frontend-food/src/pages/admin/DataQuality{Recipes,Ingredients}Page.tsx`, `frontend-food/src/components/data-quality/QuantityChecks.tsx` (neu)

## Tests

- Statistik: Median/p90, eine Zählung pro Rezept, Rezepttyp-Fallback, Mindeststichprobe.
- Ausreißer-Regel: Grenzfälle Faktor 3 und 6, 20-g-Untergrenze, fehlendes Gewicht.
- Ungeteilte Zeilen: mit `source_quantity` und per Heuristik; Import/Normalisierung setzen `source_quantity`.
- Plan-Check: Override unter Schwelle beseitigt Alert; Faktor erhöht Menge; ein Alert pro Mahlzeit und Zutat.
- Datenqualität: verdächtige Portionen nur bei Verwendung; Alias-Konflikte beidseitig; Rechte (401/403), Paginierung.
- Frontend: Hinweis an Rezeptzeile nur mit `can_edit`; neue Tabs rendern Skeleton/Leer/Fehler/Inhalt.
- Regression: Fall Bundesrat 2026 als Fixture (Sweet Onion Sauce ungeteilt, Burger-Zwiebel, Eisbergsalat-Portion, Zwiebel/Speisezwiebel-Alias).
