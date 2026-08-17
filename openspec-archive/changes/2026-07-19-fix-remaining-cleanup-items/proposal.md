## Why

Der erste Clean-Up-Durchlauf (2026-06-30) hat 77 Findings untersucht und alle 8 Critical Fixes umgesetzt. 12 Findings und 6 teilweise gefixte Issues blieben offen. Dieses Change setzt die verbleibenden Entscheidungen aus der Explore-Phase (2026-07-19) um und schließt den Clean-Up ab.

## What Changes

**Backend-Fixes:**
- `costs_per_person` als optionales Feld in Content-Basisklasse (+ Pydantic, + Zod), **BREAKING**: neues DB-Feld
- `scale-to-target`-Rundung von `round(..., 1)` auf `round(..., 2)` korrigieren
- Externe-Mahlzeit-Energie in `nutrition_aggregation.py` mit `× effective_portions` skalieren
- `PortionSuggestionOut.measuring_unit_name` im Backend ergänzen
- `normalize_recipe_portions` Quantity-Clamping auf 0.1–5000g
- Weight-Formatter aus `shopping_service.py` und `supply/utils.py` deduplizieren
- Logo-Load in `invitation_pdf.py:250`: `except Exception: pass` → `logger.warning(exc_info=True)`
- Generic-FK-Auflösung (`admin.py`, `featured.py`, `content_links.py`): breites `except Exception` auf erwartete Exceptions einschränken
- 401→403 in `nutrition.py:84`, `recipes.py:321`, `core/api.py:150/159` vereinheitlichen
- `check_rate_limit()` in `event/api/helpers.py` von In-Memory auf Redis/cache-basiert umstellen

**Frontend-Fixes:**
- `costsLabel = null` in SessionDetailPage, BlogDetailPage, GameDetailPage → API-Daten nutzen
- `MealEventListPage.tsx` useEffect-Deps korrigieren
- ProgramEditor + ShareDialog raw `fetch` durch TanStack Query Hooks ersetzen
- `RefMealEditorPage.tsx`: Raw `<div>` durch shadcn `Card/CardContent` ersetzen, Wrapper auf `max-w-7xl` umstellen, `CATEGORY_LABELS` auf Modul-Ebene hochziehen
- Hardcoded Farben (`text-green-600`, `bg-red-500`) in `RefMealEditorPage`, `AiFeedbackTab`, `RuleTab`, `RecipePreviewDialog` auf Design-Tokens umstellen
- Food-Frontend Layout-Wrapper vereinheitlichen (`MyRecipesPage`, `AdminPage`, `DataQualityPage`)
- `nutritional_tags` Zod-Schema als Single Source of Truth im Food-Frontend definieren, Haupt-Frontend importiert von dort

**Refactoring:**
- CRUD-Deduplikation: Generische Content-API-Factory in `content/base_api.py`, verwendet in `session/api.py`, `blog/api.py`, `game/api.py`

## Capabilities

### New Capabilities
- `content-api-factory`: Generische Django-Ninja-Router-Factory für Content-Typ-CRUD (autocomplete, comments, materials, by-slug)
- `cache-rate-limit`: Redis/cache-basierter Rate-Limiter als Ersatz für In-Memory-Implementierung

### Modified Capabilities
- `content-base`: `costs_per_person` Feld in Content-Basisklasse (+ Migration, Pydantic, Zod)
- `error-handling`: 401→403 für Auth-Fehler vereinheitlichen (AGENTS.md-Konvention)
- `meal-scale-to-target`: Rundung von 1 auf 2 Dezimalstellen
- `meal-cockpit`: Externe-Mahlzeit-Energie mit `× effective_portions` skalieren
- `recipe-portion-normalization`: Quantity-Clamping 0.1–5000g für Gemini-Antworten
- `quantity-display-formatting`: Gemeinsamer Weight-Formatter in `supply/utils.py`
- `ref-meal-editor`: Layout auf shadcn Card + max-w-7xl umstellen, CATEGORY_LABELS auf Modul-Ebene
- `food-design-system`: Wrapper-Konvention vereinheitlichen, Hardcoded-Farben auf Design-Tokens umstellen
- `portion-schema`: `PortionSuggestionOut.measuring_unit_name` ergänzen
- `best-practices`: Raw fetch durch TanStack Query ersetzen (ProgramEditor, ShareDialog)

## Impact

- **Backend**: `content/models/base.py` (neues DB-Feld + Migration), `recipe/services/nutrition_aggregation.py`, `planner/api/meal_plan.py`, `event/api/helpers.py`, `content/api/admin.py/featured.py/content_links.py`, `supply/schemas/ingredients.py`, `supply/utils.py`, `supply/services/shopping_service.py`, `recipe/management/commands/normalize_recipe_portions.py`, `event/services/invitation_pdf.py`, `recipe/api/nutrition.py`, `recipe/api/recipes.py`, `core/api.py`
- **Neue Datei**: `content/base_api.py` (generische Router-Factory)
- **Frontend**: `SessionDetailPage`, `BlogDetailPage`, `GameDetailPage`, `MealEventListPage`, `ShareDialog`, `ProgramEditor`, `RefMealEditorPage`, `AiFeedbackTab`, `RuleTab`, `RecipePreviewDialog`, `MyRecipesPage`, `AdminPage`, `DataQualityPage`
- **Schemas**: `content.ts` (beide Frontends + Backend Pydantic), `supply.ts` (Zod, `nutritional_tags` SSoT), `supply/schemas/ingredients.py` (Pydantic)
- **Neue API Hooks**: `useSearchUsers`, `useSearchContent`
- **Tests**: Tests für `costs_per_person`, `scale-to-target`-Rundung, `normalize`-Clamping, Rate-Limiter, Content-API-Factory
