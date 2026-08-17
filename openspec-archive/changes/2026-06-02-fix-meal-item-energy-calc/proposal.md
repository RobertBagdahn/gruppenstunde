## Why

Im Essensplan (`/meal-plans/:id`, Food-Frontend) zeigt die Energie-Anzeige unrealistisch niedrige Werte (z.B. Gulasch "32 kcal", "Ist: 3%"). Ursache ist ein Berechnungsfehler im Backend: Der pro-100g-Wert `cached_energy_kj` wird behandelt, als wäre er ein pro-Rezept-Wert — der Gewichtsfaktor (`Σ weight_g / 100`) fehlt. Dadurch sind alle kcal-Werte und die Soll/Ist-Coverage im Cockpit um Faktor ~10–20 zu klein und damit unbrauchbar.

## What Changes

- **BREAKING** (Datenformat): `MealItemOut.energy_kj` und `MealOut.total_energy_kj` liefern künftig die tatsächliche Gesamtenergie eines Rezept-Items/einer Mahlzeit (skaliert auf `norm_portions`), statt eines fehlerhaft niedrigen Werts.
- Neues denormalisiertes Cache-Feld `Recipe.cached_energy_total_kj`: Gesamtenergie des Rezepts (kJ) für alle `servings`, analog zu `cached_price_total`. Wird in `recalculate_recipe_cache` befüllt und über Signale invalidiert.
- `MealItemOut.resolve_energy_kj` und `MealOut.resolve_total_energy_kj` verwenden das neue Total-Feld statt `cached_energy_kj` (per 100g).
- Frontend (`MealEventDetailPage.tsx`): Da `energy_kj`/`total_energy_kj` bereits auf `norm_portions` skalierte Totals sind, bleibt die bestehende `/ normPortions`-Division für die Pro-Person-Anzeige korrekt — wird verifiziert, keine Logikänderung erwartet.

## Capabilities

### New Capabilities
- `meal-energy-display`: Anforderung, dass die im Essensplan angezeigten Energiewerte (pro Item, pro Mahlzeit, Soll/Ist-Coverage) die tatsächliche Rezeptmenge widerspiegeln und mit dem Nutrition-Summary konsistent sind.

### Modified Capabilities
<!-- Keine bestehende Capability hat ein Requirement zur Energie-Serialisierung der MealOut/MealItemOut-Schemas. -->

## Impact

- **Backend (`recipe` App)**:
  - `recipe/models/` — neues Feld `Recipe.cached_energy_total_kj` (Migration erforderlich: `uv run python manage.py makemigrations recipe`)
  - `recipe/services/recipe_checks.py` — `recalculate_recipe_cache` befüllt neues Feld
  - `recipe/signals.py` — Cache-Invalidierung deckt neues Feld ab (bereits über bestehende Signale, falls `update_fields` ergänzt wird)
- **Backend (`planner` App)**:
  - `planner/schemas/meal_plan.py` — `MealItemOut.resolve_energy_kj`, `MealOut.resolve_total_energy_kj`
- **Pydantic-Schemas**: `MealItemOut`, `MealOut` (Werte-Semantik ändert sich, Feldnamen bleiben)
- **Zod-Schemas (`frontend-food`)**: `MealItemSchema.energy_kj`, `MealSchema.total_energy_kj` — Typ bleibt `number`, keine Strukturänderung
- **Frontend (`frontend-food`)**: `src/pages/planning/MealEventDetailPage.tsx` (Verifikation der Anzeige-Division)
- **Tests**: `planner/tests/` für Energie-Resolver, `recipe/tests/` für Cache-Recalc und Signal-Invalidierung
- **Migration**: Bestehende Rezepte müssen neu berechnet werden (Data-Migration oder Management-Command-Lauf für `cached_energy_total_kj`).
