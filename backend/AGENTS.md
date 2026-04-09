# AI Agent Configuration – Backend (Django Ninja)

> Dieses AGENTS.md enthält **backend-spezifische** Regeln. Für projektweite Konventionen siehe `../AGENTS.md`.

## Datenmodell-Überblick

### Planner App
- **`MealEvent`** (ehem. MealPlan): name, slug, description, norm_portions, activity_factor, reserve_factor, event FK (nullable). DB table: `planner_mealplan`.
- **`Meal`**: meal_event FK, start_datetime, end_datetime, meal_type, day_part_factor. Gruppierung nach Tag via `start_datetime__date`.

### Recipe App
- **`Recipe`** (erbt Content): recipe_type, servings, nutritional_tags M2M. Hat denormalisierte Cache-Felder: `cached_energy_kj`, `cached_protein_g`, `cached_fat_g`, `cached_carbohydrate_g`, `cached_sugar_g`, `cached_fibre_g`, `cached_salt_g`, `cached_nutri_class`, `cached_price_total`, `cached_at`.
- **`RecipeItem`**: recipe FK, portion FK, ingredient FK, quantity, measuring_unit FK, sort_order, note.
- **`HealthRule`**: name, description, parameter, scope (meal_event/day/meal/recipe/ingredient), threshold_green, threshold_yellow, unit, tip_text, is_active, sort_order.

### Supply App
- **`Ingredient`**: 30+ Felder inkl. Nährwerte, Scores, `price_per_kg`. Kein separates Price-Model mehr.
- **`Portion`**: name, measuring_unit FK, ingredient FK, quantity, weight_g.

### PackingList App
- **`PackingList`**: title, description, owner FK, group FK (nullable), is_template. Sortiert nach `-updated_at`. `user_can_edit(user)` prüft Owner/Group-Admin/Staff. `clone_for_user(user)` erstellt Deep Copy.
- **`PackingCategory`**: packing_list FK, name, sort_order. Sortiert nach `sort_order, id`.
- **`PackingItem`**: category FK, name, quantity, description, is_checked, sort_order. Optional GenericFK zu Supply-Objekten via `supply_content_type`/`supply_object_id`.
- API: `packing_list_router` unter `/api/packing-lists/`. Pagination (Standard-Format) für list + templates. CRUD + clone + text-export + sort + reset-checks.

### Wichtige Services
- `recipe/services/cockpit_service.py` — evaluiert HealthRules für MealEvent/Tag/Meal
- `recipe/services/recipe_checks.py` — enthält `recalculate_recipe_cache(recipe)`
- `recipe/signals.py` — Cache-Invalidierung bei RecipeItem/Ingredient Änderungen
- `supply/services/price_service.py` — nur `get_portion_price(ingredient, weight_g)` via `price_per_kg`
- `supply/data/dge_reference.py` — statische DGE-Referenzwerte

## Arbeitsablauf – Backend-Änderungen

### Bei Content-Typ-Änderungen
1. Model in der jeweiligen App anpassen
2. Migration: `uv run python manage.py makemigrations`
3. Pydantic Schema aktualisieren
4. API-Endpunkt anpassen
5. Frontend Zod Schema synchronisieren
6. Tests schreiben/aktualisieren

### Bei Supply-Änderungen (Material/Ingredient)
1. Model in `supply/models/` anpassen
2. Migration: `uv run python manage.py makemigrations supply`
3. Schema + API aktualisieren

### Bei KI-Features (Vertex AI)
1. Logik in `content/services/ai_service.py` oder `content/services/ai_supply_service.py`
2. `google-genai` SDK verwenden (`genai.Client(vertexai=True, ...)`), keine API Keys
3. API-Endpunkt unter `/api/ai/` Prefix

## Fehler-Behandlung

```python
from ninja.errors import HttpError

raise HttpError(404, "Content not found")
raise HttpError(403, "Not authorized")
```

## Auth-Pattern

```python
if not request.user.is_authenticated:
    raise HttpError(403, "Anmeldung erforderlich")

# Admin-only
if not request.user.is_authenticated or not request.user.is_staff:
    raise HttpError(403, "Nur Admins")
```

## GCP Kontext

- **Bilder**: GCS Bucket (`gs://gruppenstunde-media/`)
- **Datenbank**: Cloud SQL PostgreSQL 15 + pgvector
- **AI**: Vertex AI Gemini Flash – ADC, keine API Keys
- **Secrets**: Google Secret Manager
- **Deployment**: Cloud Run

## Qualitäts-Checkliste – Backend

- [ ] Pydantic Schemas aktuell (→ Frontend Zod Schemas synchronisieren)
- [ ] Type Hints in allen Python Funktionen
- [ ] API-Endpunkte haben Pydantic Schema Responses
- [ ] Keine print Statements
- [ ] Keine Klar-IPs gespeichert (DSGVO)
- [ ] Content-URLs verwenden Slug
- [ ] Freitext-Felder verwenden Markdown, kein HTML
