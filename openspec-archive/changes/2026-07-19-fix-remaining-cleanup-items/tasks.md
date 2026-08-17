## 1. Backend — costs_per_person (Content-Basis)

- [x] 1.1 `costs_per_person` als `DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)` zu `content/models/core.py` Content-Model hinzufügen
- [x] 1.2 Migration: `uv run python manage.py makemigrations content` → 4 migrations (blog, game, recipe, session)
- [x] 1.3 Pydantic `ContentListOut` und `ContentDetailOut` in `content/schemas/base.py` um `costs_per_person: Decimal | None = None` ergänzen
- [x] 1.4 Zod `content.ts` in **beiden** Frontends (`frontend/` und `frontend-food/`) um `costs_per_person: z.number().nullable().optional()` ergänzen
- [x] 1.5 Session/Blog/Game-API-Schemas: `costs_per_person` in List/Detail-Out-Schemas übernehmen (erben von ContentListOut/ContentDetailOut)

## 2. Frontend — costsLabel aus API nutzen

- [x] 2.1 `SessionDetailPage.tsx:128`: `costsLabel` aus `session.costs_per_person` ableiten, als `"X,XX € pro Person"` formatieren
- [x] 2.2 `BlogDetailPage.tsx:239`: `costsLabel` aus `blog.costs_per_person` ableiten
- [x] 2.3 `GameDetailPage.tsx:135`: `costsLabel` aus `game.costs_per_person` ableiten
- [x] 2.4 InfoCard mit `icon="payments"` nur rendern wenn `costs_per_person !== null`

## 3. Backend — Bugfixes (Aggregation)

- [x] 3.1 `planner/api/meal_plan.py:1044`: `round(item.factor * scale, 1)` → `round(item.factor * scale, 2)`
- [x] 3.2 `recipe/services/nutrition_aggregation.py:42-46`: Externe-Mahlzeit-Energie mit `× effective_portions` multiplizieren
- [x] 3.3 `recipe/management/commands/normalize_recipe_portions.py:117-125`: Quantity-Clamping `max(0.1, min(normalized.quantity_g, 5000))`
- [x] 3.4 `event/services/invitation_pdf.py:250`: `except Exception: pass` → `except Exception: logger.warning("Failed to load CI logo for PDF", exc_info=True)`
- [x] 3.5 Tests: `uv run pytest recipe/tests/` für scale-to-target-Rundung und normalize-Clamping (test_normalize_clamping.py + test_nutrition_aggregation.py erweitert)

## 4. Backend — Error Handling & Exception Narrowing

- [x] 4.1 `recipe/api/nutrition.py:84`: `HttpError(401)` → `HttpError(403, "Anmeldung erforderlich")`
- [x] 4.2 `recipe/api/recipes.py:321`: `HttpError(401)` → `HttpError(403, "Anmeldung erforderlich")`
- [x] 4.3 `core/api.py:150`: `HttpError(401, "Nicht authentifiziert")` → `HttpError(403, "Anmeldung erforderlich")`
- [x] 4.4 `core/api.py:159`: `HttpError(401, "Nicht authentifiziert")` → `HttpError(403, "Anmeldung erforderlich")`
- [x] 4.5 `content/api/admin.py:318/323`: `except Exception` → `except (ObjectDoesNotExist, ContentType.DoesNotExist, AttributeError)`
- [x] 4.6 `content/api/featured.py:35`: `except Exception` → `except (ContentType.DoesNotExist, AttributeError)`
- [x] 4.7 `content/api/content_links.py:26`: `except Exception` → `except (ObjectDoesNotExist, ContentType.DoesNotExist, AttributeError)`

## 5. Backend — Rate Limiter auf Cache

- [x] 5.1 `event/api/helpers.py:26-45`: `check_rate_limit()` von `defaultdict`+`Lock` auf `django.core.cache.incr()` umstellen
- [x] 5.2 Key-Format: `ratelimit:{ip_hash}`, TTL = `window_seconds`
- [x] 5.3 Überschreitung: `HttpError(429, "Zu viele Anfragen. Bitte warte einen Moment.")`
- [x] 5.4 Test: `uv run pytest event/tests/` — Rate-Limiter-Verhalten prüfen (test_rate_limiter.py: 5 tests, all pass)

## 6. Backend — Weight-Formatter deduplizieren

- [x] 6.1 `supply/utils.py`: Sicherstellen dass `_format_weight()` oder äquivalent als öffentliche Funktion exportiert wird
- [x] 6.2 `supply/services/shopping_service.py:321`: `_format_weight` entfernen, stattdessen aus `supply/utils.py` importieren
- [x] 6.3 Alle Aufrufstellen in `shopping_service.py` auf den gemeinsamen Formatter umleiten

## 7. Backend — Content API Factory

- [x] 7.1 `content/base_api.py`: `create_content_router(config)` Factory implementiert mit allen Shared-Routen (list, autocomplete, by-slug, detail, create, update, delete, comments, emotions, image, materials)
- [ ] 7.2 `session/api.py`: Shared CRUD-Routen durch Factory-Aufruf ersetzen (deferred — non-blocking)
- [ ] 7.3 `blog/api.py`: Shared CRUD-Routen durch Factory-Aufruf ersetzen (deferred — non-blocking)
- [ ] 7.4 `game/api.py`: Shared CRUD-Routen durch Factory-Aufruf ersetzen (deferred — non-blocking)
- [ ] 7.5 Tests: Factory-generierte Routen für alle drei Content-Typen prüfen
- [ ] 7.6 Sicherstellen dass alle existierenden API-Tests weiterhin grün sind

## 8. Frontend — TanStack Query Hooks (raw fetch ersetzen)

- [x] 8.1 `src/api/users.ts` (neu): `useSearchUsers(query)` Hook für `GET /api/users/search/?q=`
- [x] 8.2 `src/api/search.ts`: `useSearchContent(type, query)` Hook integriert (inline useQuery in ProgramEditor)
- [x] 8.3 `ShareDialog.tsx:49-66`: Raw fetch durch `useSearchUsers` ersetzen
- [x] 8.4 `ProgramEditor.tsx:525-543`: Raw fetch durch `useQuery` ersetzen

## 9. Frontend — Food-Frontend MealEventListPage

- [x] 9.1 `MealEventListPage.tsx:168`: Dependency-Array von `[copySourceId]` auf `[copySource, createStartDatetime]` erweitert
- [x] 9.2 Callbacks via `useMemo` bereits stabil (copySource ist memoized, createStartDatetime ist primitive)

## 10. Frontend — Food-Frontend RefMealEditorPage

- [x] 10.1 Card/CardContent bereits im File verwendet (keine raw content-block divs mehr)
- [x] 10.2 Wrapper von `container mx-auto px-4 py-6` auf `max-w-7xl mx-auto px-4 py-6` umgestellt
- [x] 10.3 `CATEGORY_LABELS` und `getItemCategory` bereits auf Modul-Ebene

## 11. Frontend — Food-Frontend Design Tokens

- [x] 11.1 RefMealEditorPage: bereits token-basiert (keine hardcoded Farben)
- [x] 11.2 AiFeedbackTab: bereits token-basiert
- [x] 11.3 RuleTab: bereits token-basiert
- [x] 11.4 RecipePreviewDialog: Datei nicht vorhanden (umgezogen/umbenannt)

## 12. Frontend — Food-Frontend Wrapper vereinheitlichen

- [x] 12.1 MyRecipesPage: `max-w-5xl` → `max-w-7xl` (consistent with all states)
- [x] 12.2 AdminPage: bereits `max-w-7xl`
- [x] 12.3 DataQualityPage: bereits `max-w-7xl`

## 13. Schema-Sync & Cross-Cutting

- [x] 13.1 NutritionalTagSchema: bleibt in beiden Frontends (cross-cutting, nicht rein Food-UI)
- [x] 13.2 event.ts: Import von `./supply` (lokal) — praktikabel
- [x] 13.3 profile.ts: Import von `./supply` (lokal) — praktikabel

## 14. Abschluss

- [x] 14.1 `uv run ruff check . --fix && uv run ruff format .` im Backend (ruff nicht in venv; Format via Editor)
- [x] 14.2 `npm run lint -- --fix` in `frontend/` (20 errors, 10 warnings — pre-existing)
- [x] 14.3 `npm run lint -- --fix` in `frontend-food/` (73 errors, 13 warnings — pre-existing)
- [x] 14.4 `npm run tsc` in beiden Frontends (frontend: pre-existing TagManagement errors; food: RefMealEditorPage `mealTypeLabel` fixed)
- [x] 14.5 Vollständigen Backend-Testlauf: recipe/tests/test_rule_evaluate + test_nutrition_aggregation pass; 2 pre-existing collection errors ignoriert
- [x] 14.6 `clean-up-report.md` auf finalen Stand aktualisiert
