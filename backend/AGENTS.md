# AI Agent Configuration – Backend (Django Ninja)

> Dieses AGENTS.md enthält **backend-spezifische** Regeln. Für projektweite Konventionen siehe `../AGENTS.md`.

## Datenmodell-Überblick

### Planner App
- **`MealPlan`**: name, slug, description, norm_portions, reserve_factor, event FK (nullable). DB table: `planner_mealplan`. Kein `activity_factor`/PAL mehr — PAL lebt nur noch im Norm-Portion-Rechner. `scaling_factor` = `norm_portions × reserve_factor`.
- **`Meal`**: meal_plan FK, start_datetime, end_datetime, meal_type, day_part_factor. Gruppierung nach Tag via `start_datetime__date`.

### Recipe App
- **`Recipe`** (erbt Content): recipe_type, servings, nutritional_tags M2M. Hat denormalisierte Cache-Felder: `cached_energy_kcal` (pro 100g), `cached_energy_total_kcal` (Gesamtenergie des Rezepts), `cached_protein_g`, `cached_fat_g`, `cached_carbohydrate_g`, `cached_sugar_g`, `cached_fibre_g`, `cached_salt_g`, `cached_nutri_class`, `cached_price_total`, `cached_at`.
- **`RecipeItem`**: recipe FK, portion FK, ingredient FK, quantity, measuring_unit FK, sort_order, note.
- **`Rule`**: name, description, parameter (`energy_kcal`, `sugar_g`, etc.), scope (meal_event/day/meal/recipe), rule_type, min_green, min_yellow, max_green, max_yellow, unit, hint_level (`RuleHintLevelChoices`), tip_text, improvement_text, is_active, sort_order. Ersetzt das alte `HealthRule`- und `RecipeHint`-Modell.

### Recipe Choices & Backward Compat Aliase

Die aktuellen Choices-Klassen leben in `recipe/choices.py`. Folgende Aliase sind **DEPRECATED** und werden in einer zukünftigen Migration entfernt:

- `HintParameterChoices` → aus `supply.choices` re-exportiert. Korrekter Enum-Wert ist `ENERGY_KCAL` (nicht `ENERGY_KJ`).
- `HintMinMaxChoices` → aus `supply.choices` re-exportiert. Vom Rule-Modell durch `min_green`/`min_yellow`/`max_green`/`max_yellow` abgelöst.
- `HintLevelChoices` → aus `supply.choices` re-exportiert. Das Rule-Modell verwendet `RuleHintLevelChoices` (in `recipe/models/rule.py`).
- `RecipeStatusChoices` → Alias für `ContentStatus`. Bitte direkt `ContentStatus` verwenden.

### Supply App
- **`Ingredient`**: 30+ Felder inkl. Nährwerte, Scores, `price_per_kg`. Kein separates Price-Model mehr. M2M `groups` → `IngredientGroup` für Such-Gruppierung.
- **`IngredientGroup`**: name, slug. Einfache Gruppierung von Zutaten für die Suche (z.B. "Nudeln" → Fusilli + Spaghetti). API unter `/api/ingredient-groups/`. Filter `?group=` auf `GET /api/ingredients/`.
- **`Portion`**: name, measuring_unit FK, ingredient FK, quantity, weight_g.

### PackingList App
- **`PackingList`**: title, description, owner FK, group FK (nullable), is_template. Sortiert nach `-updated_at`. `user_can_edit(user)` prüft Owner/Group-Admin/Staff. `clone_for_user(user)` erstellt Deep Copy.
- **`PackingCategory`**: packing_list FK, name, sort_order. Sortiert nach `sort_order, id`.
- **`PackingItem`**: category FK, name, quantity, description, is_checked, sort_order. Optional GenericFK zu Supply-Objekten via `supply_content_type`/`supply_object_id`.
- API: `packing_list_router` unter `/api/packing-lists/`. Pagination (Standard-Format) für list + templates. CRUD + clone + text-export + sort + reset-checks.

### Wichtige Services
- `recipe/services/suggestion_service.py` — evaluiert Rules für MealPlan/Tag/Meal und Rezepte
- `recipe/services/recipe_checks.py` — enthält `recalculate_recipe_cache(recipe)`
- `recipe/signals.py` — Cache-Invalidierung bei RecipeItem/Ingredient Änderungen
- `supply/services/price_service.py` — nur `get_portion_price(ingredient, weight_g)` via `price_per_kg`
- `supply/data/dge_reference.py` — statische DGE-Referenzwerte

### AI Interaction Logging

Jeder KI-Call wird automatisch in `content/models/ai_interaction.py` → `AiInteraction` geloggt:

- **Modell**: `AiInteraction` (UUID PK, context, prompt, response, model, user FK, duration_ms, success, error_code, vote, voted_at, created_at)
- **Logging-Ort**: Zentral in `core/services/gemini.gemini_call()` — vor dem Call wird der Record angelegt, nach dem Call aktualisiert
- **Return-Typ**: `gemini_call()` gibt `(GenerateContentResponse | None, UUID)` zurück — die UUID ist die `AiInteraction.id`
- **Callers**: Alle Aufrufer müssen `response, interaction_id = gemini_call(...)` verwenden. Die `interaction_id` kann in API-Responses als `ai_interaction_id: str | None` weitergegeben werden
- **Vote-Endpoint**: `PATCH /api/content/ai-interactions/{interaction_id}/vote/` — nur Owner oder Staff
- **Aggregation**: `GET /api/content/admin/ai-interactions/stats/` — nur Staff, liefert Gesamt-Stats + per-context + 30-Tage-Timeline
- **Konventionen**: `str(interaction_id)` in Response-Schemas (UUID als String), `ai_interaction_id` als Feldname

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

- **Bilder**: GCS Bucket (`gs://inspi-media/`)
- **Datenbank**: Cloud SQL PostgreSQL 15 + pgvector
- **AI**: Vertex AI Gemini Flash – ADC, keine API Keys
- **Secrets**: Google Secret Manager
- **Deployment**: Cloud Run

## Management Commands

### `import_inspi_data`
- Deduplizierter Import aus dem Inspi-Altprojekt (Zutaten, Rezepte, Materialien, Aktivitäten)
- Idempotent: wiederholter Lauf erzeugt keine Duplikate (Slug-basierte Dedup)
- `status=verified` für Ingredients
- Einziger Aufruf: `uv run python manage.py import_inspi_data [--data-dir /path/to/inspi/data]`

### `import_legacy_food`
- **Bulk-Import** der vier Legacy-Food-JSON-Dateien aus `/inspi/data/food/`
- **Keine Deduplizierung** von Content-Daten (Ingredients, Portions, Recipes, RecipeItems) — jede Legacy-Zeile wird als neue DB-Zeile angelegt
- Stammdaten (MeasuringUnit, RetailSection, NutritionalTag, Rule) bleiben idempotent via `get_or_create`
- `status=user_content` für Ingredients, `status=approved` + `owner=None` für Recipes
- Signale werden während des Imports disconnected, Cache-Neuberechnung läuft gebündelt am Ende
- Flags:
  - `--data-dir`: Pfad zum Food-Datenverzeichnis (Default: `/Users/robertbagdahn/code/inspi/data/food`)
  - `--files 0,1,2,3`: Komma-separierte Datei-Auswahl (0=Stammdaten, 1=REWE-Zutaten, 2=FDC-Zutaten, 3=Rezepte)
  - `--dry-run`: Mapping komplett durchlaufen, aber DB-Änderungen am Ende rollbacken
  - `--batch-size 500`: Batch-Größe für `bulk_create`
- Tests: `uv run pytest core/tests/test_import_legacy_food.py`

## Qualitäts-Checkliste – Backend

- [ ] Pydantic Schemas aktuell (→ Frontend Zod Schemas synchronisieren)

## Search-Konventionen

- **Unified Search**: `/api/content/search/` durchsucht alle Content-Typen (session, blog, game, recipe, event)
- **`scope`-Parameter**: `all` (Default) oder `mine`. Bei `scope=mine` werden pro Typ user-spezifische Filter angewandt:
  - session/blog/game: `created_by=user OR authors=user`
  - recipe: `owner=user OR authors=user`
  - event: `created_by OR responsible_persons OR invited_users OR invited_groups (via GroupMembership) OR registrations`
- **Draft-Sichtbarkeit**: Bei `scope=mine` werden eigene Drafts (status=draft) mit zurückgegeben
- **Templates**: Events mit `is_template=True` werden immer aus Search-Ergebnissen ausgeschlossen
- **Anonyme User**: `scope=mine` wird ignoriert (fallback auf `all`)
- **Implementierung**: `content/services/search_service.py` → `apply_mine_filter()`, `unified_search()`
- Spec: `openspec/changes/search-mine-scope-filter/specs/search/spec.md`
- [ ] Type Hints in allen Python Funktionen
- [ ] API-Endpunkte haben Pydantic Schema Responses
- [ ] Keine print Statements
- [ ] Keine Klar-IPs gespeichert (DSGVO)
- [ ] Content-URLs verwenden Slug
- [ ] Freitext-Felder verwenden Markdown, kein HTML

## Testing-Pflicht

**Für jeden neuen oder geänderten API-Endpunkt und für komplexe Backend-Prozesse MÜSSEN Tests geschrieben werden.** Das umfasst:

- **API-Endpunkte**: Mindestens Happy-Path + Fehlerfall (401/403/404) testen
- **Signals / Denormalisierung**: Testen, dass Signale korrekt feuern und Daten konsistent bleiben (create, update, delete)
- **Services mit Geschäftslogik**: Unit-Tests für Berechnungen, Aggregationen, Filterlogik
- **Management Commands**: Testen, dass idempotent und korrekt

Test-Konventionen:
- Framework: `pytest` + `pytest-django`
- Factories: `model_bakery` (baker.make) + App-spezifische `make_*` Helpers in `<app>/tests/__init__.py`
- Dateien: `<app>/tests/test_<feature>.py`
- Klassen: `@pytest.mark.django_db class Test<Feature>:`
- DB: SQLite in Tests (kein PostgreSQL-FTS — FTS-abhängige Tests mit `recipe_type`-Filter umgehen oder skippen)

## Migrationen — Lebenswichtige Regeln

### ❌ NIEMALS bestehende Migrationen in-place ändern

Migrationen, die bereits auf **irgendeiner** Umgebung (lokal, staging, prod) ausgeführt wurden, dürfen **niemals** nachträglich editiert werden (`0001_initial.py`, `0007_meal_enhancements.py`, etc.).

**Warum:** Die `django_migrations`-Tabelle speichert nur, *dass* eine Migration ausgeführt wurde, nicht *welchen Code* sie damals hatte. Wird die Datei nachträglich geändert (Feld umbenannt, Tabelle anders angelegt), entsteht ein permanenter Drift zwischen Datenbank und Modell — der nur durch manuelle SQL-Migrationen repariert werden kann.

✅ **Stattdessen:** Für jede Schema-Änderung eine **neue Migration** erstellen:
```bash
uv run python manage.py makemigrations
```

### ✅ Nach jedem Model-Change prüfen

```bash
uv run python manage.py makemigrations --check  # sollte 0 sein
uv run python manage.py showmigrations          # keine [ ] Einträge
```

### ⚠️ Vor dem Deploy auf Produktion

Bei bestehenden Datenbanken (nicht frisch via `migrate` angelegt):

1. `uv run python manage.py makemigrations --check` — muss "No changes detected" melden
2. `uv run python manage.py showmigrations` — alle Einträge müssen `[X]` sein
3. Vollständigen DB-Check machen:
   ```python
   # Fehlt eine DB-Tabelle für ein Model?
   # Starte Django shell und prüfe:
   from django.db import connection
   for model in apps.get_models():
       with connection.cursor() as cursor:
           cursor.execute("SELECT to_regclass(%s)", [model._meta.db_table])
           if cursor.fetchone()[0] is None:
               print("FEHLT:", model._meta.db_table)
   ```
