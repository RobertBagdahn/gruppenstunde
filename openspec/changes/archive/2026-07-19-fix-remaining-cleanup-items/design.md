## Context

Der erste Clean-Up (2026-06-30) hat 8 Critical Bugs behoben. Die zweite Explore-Phase (2026-07-19) hat die verbleibenden 18 Items einzeln bewertet. Dieses Design dokumentiert die technischen Entscheidungen für die Umsetzung.

Die Änderungen betreffen Backend (Django-Ninja), Frontend (React) und Food-Frontend (React), sowie Schema-Synchronisation (Pydantic ↔ Zod).

## Goals / Non-Goals

**Goals:**
- `costs_per_person` als Content-Basisfeld nachrüsten (Backend + beide Frontends)
- Bugfixes in Aggregation (`scale-to-target`-Rundung, externe-Mahlzeit-Energie)
- Rate-Limiter auf Redis/cache migrieren
- 401→403 vereinheitlichen
- Raw fetch durch TanStack Query ersetzen (ProgramEditor, ShareDialog)
- Food-Frontend Layout/Token-Konsistenz herstellen
- Weight-Formatter deduplizieren
- Generische Content-API-Factory für session/blog/game
- Generic-FK-Exception-Handling einschränken
- `normalize_recipe_portions` Quantity-Clamping

**Non-Goals:**
- Standalone-Ingredient-Skalierung ändern (bewusste Design-Entscheidung aus Runde 1)
- Vitamine/Minerale ins Backend nachrüsten (Produkt-Entscheidung: UI entfernt)
- `NutritionalTagSchema` physisch ins Food-Frontend verschieben (bleibt im Haupt-Frontend als Import vom Food-Frontend — war nie Food-UI)
- Tests für bestehende, ungetestete Pfade (separater Test-Durchlauf)

## Decisions

### 1. `costs_per_person` — DecimalField mit 2 Dezimalstellen

**Entscheidung:** `models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)` im Content-Model.

**Alternativen verworfen:**
- IntegerField in Cent: Overengineering für optionale Kostenschätzung
- Nur String "kostenlos/gering/mittel/hoch": Zu ungenau für Budget-Planung

**Schema-Additions:**
- Pydantic `ContentListOut` + `ContentDetailOut`: `costs_per_person: Decimal | None = None`
- Zod `content.ts` (beide Frontends): `costs_per_person: z.number().nullable().optional()`
- Keine Pflichtfeld-Validierung — viele existierende Inhalte haben keine Kosten

**Frontend-Nutzung:**
- `SessionDetailPage`, `BlogDetailPage`, `GameDetailPage`: `costsLabel` aus `session.costs_per_person` ableiten, formatieren als `"X,XX € pro Person"` oder `null` wenn nicht gesetzt
- InfoCard mit `icon="payments"` nur rendern wenn Wert nicht null

### 2. `scale-to-target` — Rundung auf 2 Dezimalstellen

**Entscheidung:** `round(item.factor * scale, 2)` statt `round(..., 1)`.

**Datei:** `backend/planner/api/meal_plan.py:1044`

**Begründung:** Faktor 0.04 wurde zu 0.0 gerundet → Item verschwindet. Bei 2 Dezimalstellen: 0.04 → 0.04 (bleibt sichtbar bei Anzeige mit 2 Dezimalen). Drei Dezimalstellen wären Overprecision für UI.

### 3. Externe Mahlzeit-Energie — × effective_portions

**Entscheidung:** In `_aggregate_meal_values()` den externen Mahlzeit-Branch mit `effective_portions` multiplizieren.

```python
# Vorher: totals["energy_kcal"] = meal.external_energy_kcal
# Nachher:
effective_portions = meal.effective_portions if hasattr(meal, "effective_portions") else 1
totals["energy_kcal"] = meal.external_energy_kcal * effective_portions
```

**Datei:** `backend/recipe/services/nutrition_aggregation.py:42-46`

**Begründung:** Interne Mahlzeiten aggregieren pro Normportion über alle Items — Summe wächst mit `effective_portions`. Externe Mahlzeiten setzen `external_energy_kcal` (pro Person), was ohne Multiplikation um etwa Faktor `effective_portions` zu niedrig ist. Die Multiplikation stellt Konsistenz her.

### 4. Rate-Limiter — django.core.cache

**Entscheidung:** `check_rate_limit()` von `defaultdict` + `Lock` auf `django.core.cache` umstellen.

```python
from django.core.cache import cache

def check_rate_limit(request, max_requests=10, window_seconds=3600):
    key = f"ratelimit:{hash_ip(request)}"
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window_seconds)
        count = 1
    if count > max_requests:
        raise HttpError(429, "Zu viele Anfragen.")
```

**Datei:** `backend/event/api/helpers.py:26-45`

**Begründung:** Aktueller In-Memory-Store ist pro-Prozess, auf Cloud Run mit N Instanzen wirkungslos. `django.core.cache` mit Redis-Backend (bereits in Produktion via Cloud Memorystore) löst das. Fallback auf LocMemCache im Dev-Betrieb funktioniert automatisch.

### 5. 401 → 403 für Auth-Fehler

**Entscheidung:** Alle verbleibenden `HttpError(401, ...)` in `HttpError(403, "Anmeldung erforderlich")` ändern.

**Betroffene Stellen:**
- `backend/recipe/api/nutrition.py:84`
- `backend/recipe/api/recipes.py:321`
- `backend/core/api.py:150` (data-overview)
- `backend/core/api.py:159` (data-export)

**Begründung:** AGENTS.md (Backend) schreibt `HttpError(403, "Anmeldung erforderlich")` als Standard vor. Die Mehrheit der Endpunkte nutzt bereits 403. Dies stellt Konsistenz her.

### 6. Generic-FK-Auflösung — Exception-Narrowing

**Entscheidung:** `except Exception` in `admin.py:318/323`, `featured.py:35`, `content_links.py:26` auf erwartete Exceptions einschränken.

**Pattern:**
```python
# Vorher:
except Exception:
    logger.warning(...)  # oder pass
# Nachher:
except (ContentType.DoesNotExist, model_class.DoesNotExist, AttributeError):
    logger.warning(...)
```

**Begründung:** Das aktuelle `except Exception` fängt auch Programmierfehler (TypeError, ImportError) still ab. Nur erwartete Lookup-Fehler sollten behandelt werden.

### 7. Generische Content-API-Factory

**Entscheidung:** `create_content_api_router()` in `content/base_api.py` erstellen, die autocomplete, comments, materials, by-slug Routen für einen Content-Typ generiert.

**Datei:** `backend/content/base_api.py` (neu)

**Pattern:**
```python
def create_content_api_router(content_model, list_schema, detail_schema, prefix: str) -> Router:
    router = Router()
    # GET /autocomplete/
    # GET /{slug}/
    # GET /{slug}/comments/
    # ...
    return router
```

**Betroffene Apps:** `session/api.py`, `blog/api.py`, `game/api.py` verwenden Factory statt dupliziertem Code.

**Begründung:** ~85% identischer CRUD-Code in drei Content-Type-APIs. Factory reduziert Duplikation, macht zukünftige Änderungen an einem Ort möglich.

### 8. RefMealEditorPage — shadcn Card + max-w-7xl

**Entscheidung:**
- Alle raw `<div className="border rounded-lg">` durch `<Card><CardContent>...</CardContent></Card>` ersetzen
- Wrapper von `container mx-auto px-4 py-6` auf `max-w-7xl mx-auto px-4 py-6` umstellen
- `CATEGORY_LABELS` und `getItemCategory` auf Modul-Ebene hochziehen (vor Komponente)

**Datei:** `frontend-food/src/pages/planning/RefMealEditorPage.tsx`

**Begründung:** shadcn Card ist der Standard im Food-Frontend. Raw divs sind anti-pattern. Modul-Ebene vermeidet Re-Allokation bei jedem Render.

### 9. Hardcoded Farben → Design-Tokens

**Entscheidung:** Alle hartcodierten Tailwind-Farbklassen ersetzen:
- `text-green-600` → `text-primary`
- `bg-red-500` → `bg-destructive` / `text-destructive`
- Hex-Farben → `hsl(var(--chart-N))` oder `hsl(var(--destructive))`

**Betroffene Dateien:**
- `RefMealEditorPage.tsx:461`
- `AiFeedbackTab.tsx:94/95/128/135`
- `RuleTab.tsx:19/21`
- `RecipePreviewDialog.tsx:22-26`

**Begründung:** Design-Tokens sind Theme-kompatibel (Dark Mode), SSOT. Hardcoded Farben brechen aus dem Design-System aus.

### 10. Food-Frontend Wrapper-Vereinheitlichung

**Entscheidung:** Alle Top-Level-Page-Wrapper auf `max-w-7xl mx-auto px-4 py-6` standardisieren.

**Betroffene Dateien:**
- `MyRecipesPage.tsx`: `container py-8` / `max-w-5xl` → `max-w-7xl mx-auto px-4 py-6`
- `AdminPage.tsx:37`: `container py-6` → `max-w-7xl mx-auto px-4 py-6`
- `DataQualityPage.tsx:21`: `container py-6` → `max-w-7xl mx-auto px-4 py-6`

**Begründung:** 3 verschiedene Wrapper-Konventionen → inkonsistentes Layout. `max-w-7xl` ist der Standard im Food-Frontend.

### 11. Weight-Formatter — supply/utils.py als SSOT

**Entscheidung:** `supply/utils.py:12-38` als kanonischen Formatter behalten. `shopping_service.py:_format_weight` entfernen und durch Import aus `supply/utils.py` ersetzen.

**Begründung:** Zwei Formatter mit unterschiedlichem Rundungsverhalten führen zu Anzeige-Inkonsistenzen zwischen Rezept und Einkaufsliste.

### 12. normalize_recipe_portions — Quantity-Clamping

**Entscheidung:** `quantity_g = max(0.1, min(normalized.quantity_g, 5000))` nach dem Gemini-Call.

**Datei:** `backend/recipe/management/commands/normalize_recipe_portions.py:117-125`

**Begründung:** Aktuell nur `<= 0` Check. Abstrus hohe Werte (z.B. LLM halluziniert 99999g) korrumpieren Rezeptdaten. Clamping verhindert das.

### 13. ProgramEditor + ShareDialog → TanStack Query

**Entscheidung:** Neue Hooks in `src/api/` anlegen:
- `useSearchUsers(query)` in `src/api/users.ts` (GET /api/users/search/)
- `useSearchContent(type, query)` in `src/api/search.ts`

**Betroffene Dateien:**
- `frontend/src/components/events/dashboard/ProgramEditor.tsx:525-543`
- `frontend/src/components/shared/ShareDialog.tsx:49-66`

**Begründung:** Raw fetch bricht das TanStack-Query-Pattern. Neue Hooks folgen der bestehenden Konvention (`onSuccess`/`onError` in Komponenten, Toast in Komponenten).

### 14. MealEventListPage useEffect Deps

**Entscheidung:** Dependency-Array von `[copySourceId]` auf `[copySource, createStartDatetime]` erweitern.

**Datei:** `frontend-food/src/pages/planning/MealEventListPage.tsx:168`

**Begründung:** `copySource` und `createStartDatetime` werden im Effekt gelesen, sind aber nicht in den Deps. Der Auto-Fill-Mechanismus für Endzeit greift dadurch nicht zuverlässig. Potenzielle Re-Render-Schleife durch Callback-Stabilisierung (`useCallback`) vermeiden.

### 15. NutritionalTags — Import aus Food-Frontend

**Entscheidung:** `NutritionalTagSchema` im Food-Frontend (`frontend-food/src/schemas/supply.ts`) als SSOT definieren. Haupt-Frontend importiert von dort per relativen Pfad.

**Betroffene Dateien:**
- `frontend/src/schemas/event.ts:66/141`
- `frontend/src/schemas/profile.ts:19`

**Begründung:** Schema lebt im Food-Kontext, aber User- und Event-Präferenzen nutzen es Cross-Cutting. Ein Import statt Duplikation.

### 16. Weitere Fixes

- **Logo-Load `invitation_pdf.py:250`**: `except Exception: pass` → `except Exception: logger.warning("Failed to load CI logo for PDF", exc_info=True)`
- **`PortionSuggestionSchema.measuring_unit_name`**: Backend liefert das Feld bereits (`ingredients.py:524`), keine Änderung nötig.
- **`session/api.py`, `blog/api.py`, `game/api.py`**: `costs_per_person` in List/Detail-Schemas ergänzen.

## Risks / Trade-offs

- **[costs_per_person DB-Migration]**: Neues Feld auf Content-Tabelle mit vielen existierenden Rows → `null=True`, kein Default, kein `RunPython` nötig. Kein Downtime-Risiko.
- **[Rate-Limiter Cache-Fallback]**: Wenn Redis nicht erreichbar ist, fällt `django.core.cache` auf LocMemCache zurück → pro-Prozess, aber kein Crash. Best-Effort-Rate-Limiting.
- **[CRUD-Factory]**: Abstraktion über 3 Content-Typen könnte zukünftige typspezifische Anforderungen erschweren. Gelöst durch `extra_routes` Callback-Parameter in der Factory.
- **[RefMealEditorPage Umbau]**: Größere UI-Änderung (~18 Card-Ersetzungen). Vorher/Nachher visuell prüfen.
- **[MealEventListPage useEffect Deps]**: Re-Render-Risiko durch instabile Callbacks. Mit `useCallback`-Memoization abfangen.
