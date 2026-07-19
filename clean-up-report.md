# Clean-Up Report — ganzes Repo — 2026-06-30

## Status: Zweite Runde abgeschlossen (Stand 2026-07-19)

Nach der ersten Runde (Juni 2026) blieben 18 offene Findings. Die zweite Runde hat alle priorisierten Fixes umgesetzt.

### Neu behoben (Runde 2)

**Backend**
- `costs_per_person` als Content-Basisfeld (DecimalField, 4 Migrationen, Pydantic + Zod sync)
- `scale-to-target`-Rundung: `round(..., 1)` → `round(..., 2)` — kleine Faktoren bleiben erhalten
- Externe-Mahlzeit-Energie × `effective_portions` in `nutrition_aggregation.py`
- `normalize_recipe_portions`: Quantity-Clamping 0.1–5000g für Gemini-Antworten
- `invitation_pdf.py`: Logo-Load `except: pass` → `logger.warning(exc_info=True)`
- 401→403 an 4 Stellen vereinheitlicht (`nutrition.py`, `recipes.py`, `core/api.py`×2)
- Exception-Narrowing: `admin.py`, `featured.py`, `content_links.py` — breites `except Exception` auf `ObjectDoesNotExist`/`ContentType.DoesNotExist`/`AttributeError`
- Rate-Limiter: von In-Memory-`defaultdict` auf `django.core.cache` (Cloud Run ready)
- Weight-Formatter: `shopping_service.py` nutzt jetzt `supply.utils.format_weight` (dedupliziert)
- Content-API-Factory: `create_content_router()` in `content/base_api.py` (bereit für neue Content-Typen)

**Frontend**
- `costsLabel` in SessionDetailPage/BlogDetailPage/GameDetailPage aus `costs_per_person` mit Bedingungsrender
- ShareDialog: raw fetch → `useSearchUsers` TanStack Query Hook
- ProgramEditor: raw fetch → `useQuery` mit Toast-Error
- `MealEventListPage` useEffect-Deps von `[copySourceId]` auf `[copySource, createStartDatetime]`
- RefMealEditorPage: Wrapper `container` → `max-w-7xl`, `mealTypeLabel` TypeScript-Fehler gefixt
- MyRecipesPage: Wrapper `max-w-5xl` → `max-w-7xl`

**Neue Tests (Runde 2)**
- `event/tests/test_rate_limiter.py` — 5 Tests (Cache-basiert, Limit, IP-Isolation, X-Forwarded-For)
- `recipe/tests/test_normalize_clamping.py` — 6 Tests (Clamping auf 0.1–5000g)
- `recipe/tests/test_nutrition_aggregation.py` — +3 Tests (externe Energie × effective_portions)
- `frontend/src/pages/costsLabel.test.ts` — 8 Tests (Formatierung null/undefined/Dezimal/String)

**Bereits gefixt in Runde 1 oder nicht nötig**
- Design-Tokens: RefMealEditorPage, AiFeedbackTab, RuleTab bereits token-basiert (keine hardcoded Farben)
- RecipePreviewDialog: Datei existiert nicht mehr
- AdminPage/DataQualityPage Wrapper: bereits `max-w-7xl`
- CATEGORY_LABELS: bereits auf Modul-Ebene
- Hardcoded Farben: in allen untersuchten Files bereits behoben
- `measuring_unit_name`: Backend liefert Feld bereits (`ingredients.py:524`)

**Deferred (non-blocking)**
- Factory-Wiring in session/blog/game API (Factory existiert, ~85% weniger Duplikation bei Verwendung)


## Status: Behobene Findings (Stand 2026-06-30)

**🔴 Critical behoben**
- `ingredient.density` → `physical_density` (`nutrition_aggregation.py`, `meal_plan.py`) — ml-Crash weg
- `usePermissions` → `is_staff`/`is_superuser` (+ Backend `UserOut` & Zod `UserSchema` um `is_superuser` synchronisiert)
- 7× React-Hooks-Order (RefMealEditorPage, DataDistributionsPage)
- DSGVO `anonymize()`: kein stilles `except: pass` mehr (loggt + raised)
- Food-UI (`NutritionSection`) + Stats-Nutrition-Schema aus Haupt-Frontend entfernt

**🟠 High behoben**
- `page_size`-Cap (zentral in `paginate_queryset` = `MAX_PAGE_SIZE=100` + `unified_search`)
- Guest-Registration Account-Hijack: bestehende passwortgeschützte Accounts werden nicht mehr per E-Mail übernommen (+ Tests angepasst)
- `Rule.clean()` validiert Schwellen-Reihenfolge (min_yellow≤min_green≤max_green≤max_yellow) (+ Tests)

**🟡 Medium behoben**
- embedding_service: 4× `except: pass` → `logger.warning(exc_info=True)`
- TableView: 4× leeres `catch {}` → `toast.error`
- Vitamin/Mineral-UI (außer Vitamin C) + `standalone_type`-UI im Food-Frontend entfernt (Backend speichert sie nicht) + Zod-Phantomfelder bereinigt

**Schema-Sync behoben**
- `quality_score`(+`_updated_at`), `usage_count`, `source_url` ergänzt; `measuring_unit_name` optional

**Tooling**
- frontend `eslint.config.js` neu (ESLint lief gar nicht mehr); ruff `--fix`+format (134 Fehler); food eslint `--fix`

**Neue Tests**
- `recipe/tests/test_rule_evaluate.py` (Rule.evaluate Ampel + Rule.clean Validierung)
- `recipe/tests/test_nutrition_aggregation.py::...::test_standalone_ingredient_ml_uses_physical_density` (hätte den density-Crash gefangen)

**Bewusst NICHT geändert (Begründung)**
- **Standalone-Ingredient-Skalierung × effective_portions**: War ein **False-Positive** des Audits. Die per-Normportion-Aggregation in `_aggregate_meal_values` ist beabsichtigt und durch `test_person_factors_do_not_affect_aggregation` abgesichert (Ampel vergleicht gegen pro-Person-DGE-Werte). Eine Angleichung an die Summary-Totals hätte das Design gebrochen.
- **Vitamine/Minerale ins Backend nachrüsten**: stattdessen UI entfernt (Produkt-Entscheidung).

---

## Zusammenfassung (urspr. Audit)
- Geprüfter Scope: ganzes Repo (`backend/`, `frontend/`, `frontend-food/`, `openspec/`)
- Findings gesamt: **77**  (🔴 8 · 🟠 24 · 🟡 30 · 🟢 15)
- Tooling-Status: ruff **fail (174 errors, 134 auto-fixbar)** · mypy **n/a (mypy nicht installiert)** · frontend ESLint **broken (fehlende `eslint.config.js`, ESLint 9)** · frontend tsc **fail (15 errors)** · food ESLint **fail (36 errors)** · food tsc **ok** · openspec validate **170/211 fail (systemisch)** · Tests **nicht vollständig ausgeführt**

## Top-Prioritäten
1. 🔴 [bug] `ingredient.density` existiert nicht (Feld heißt `physical_density`) → AttributeError-Crash bei jedem `ml`-Standalone-Ingredient — `backend/recipe/services/nutrition_aggregation.py:124`, `backend/planner/schemas/meal_plan.py:192-193`
2. 🔴 [bug] `usePermissions` liest `user.role` (existiert nicht; Schema hat nur `is_staff`) → **alle Staff/Admin-Gates dauerhaft false** — `frontend/src/hooks/usePermissions.ts:12`
3. 🔴 [wrong-logic] Standalone-Ingredient-Nährwerte werden in 3 Aggregatoren unterschiedlich skaliert (Cockpit-Ampel zählt um Faktor `effective_portions` zu niedrig) — `backend/recipe/services/nutrition_aggregation.py:131-145`
4. 🔴 [bug] 7× React-Hooks-Order-Verletzung (useMemo/Hook nach early return / im Ternary) → Crash/State-Korruption — `frontend-food/src/pages/planning/RefMealEditorPage.tsx:204,217,224`, `frontend-food/src/pages/DataDistributionsPage.tsx:102,103,124,125`
5. 🔴 [risk] DSGVO: `anonymize()` kapselt UserPreference-Reset in `except Exception: pass` → PII bleibt bei Fehler still un-anonymisiert — `backend/profiles/services/privacy.py:185-194`
6. 🔴 [risk] Architektur-Verstoß: Nährwert-/Food-UI (`NutritionSection`) im Haupt-Frontend — `frontend/src/components/events/dashboard/StatsView.tsx:262-285`
7. 🟠 [risk] Guest-Registration hängt an bestehendem Account allein per E-Mail (keine Verifikation) → Account-Hijack/E-Mail-Enumeration — `backend/event/services/guest_registration.py:24-37`
8. 🟠 [risk] `page_size` ohne Obergrenze → unbounded Querysets — `backend/content/api/helpers.py:273` + Filter-Schemas

---

## Findings nach Kategorie

### bug
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🔴 | `backend/recipe/services/nutrition_aggregation.py:124` | `ingredient.density` existiert nicht (Feld = `physical_density`) → AttributeError bei `ml`-Ingredients | `getattr(ingredient, "physical_density", None) or 1.0` (wie `meal_item_helpers.py:67`) |
| 🔴 | `backend/planner/schemas/meal_plan.py:192-193` | Gleicher `ingredient.density`-Crash im `MealItemOut.quantity_g`-Serializer | `obj.ingredient.physical_density` |
| 🔴 | `frontend/src/hooks/usePermissions.ts:12` | `user?.role` existiert nicht (`auth.ts` hat nur `is_staff`) → `isStaff`/`isAdmin` immer false | Aus `user?.is_staff` ableiten |
| 🔴 | `frontend-food/src/pages/planning/RefMealEditorPage.tsx:204,217,224` | 3× `useMemo` nach early return → Hooks-Order-Verletzung | useMemo vor early returns hochziehen |
| 🔴 | `frontend-food/src/pages/DataDistributionsPage.tsx:102,103,124,125` | 4× Hook im Ternary aufgerufen → bedingter Hook | Beide Hooks mit `enabled`-Flag aufrufen oder Komponente splitten |
| 🟠 | `frontend/src/components/events/dashboard/ParticipantsTab.tsx:157` | `event.phase === 'post'` nie wahr (Enum-Wert = `'completed'`) → Attendance fehlt bei abgeschlossenen Events | `phase === 'completed'` |
| 🟠 | `frontend/src/pages/sessions/SessionDetailPage.tsx:126,225`, `blogs/BlogDetailPage.tsx:338`, `games/GameDetailPage.tsx:240` | `costsLabel = null` an `<InfoCard label: string>` → „Kosten/Person"-Karte leer | Kosten-Berechnung reaktivieren oder Karte ausblenden |
| 🟠 | `frontend/src/pages/ParentPage.tsx:153,176` | `<MapView label=…>` — Prop nicht im Typ → Treffpunkt-Namen werden nie angezeigt | `label` zu `MapViewProps` hinzufügen + rendern |
| 🟠 | `backend/event/api/helpers.py:26` | In-Memory-Rate-Limiter ist per-Prozess → auf Multi-Instanz-Cloud-Run wirkungslos | Über `django.core.cache` (Redis) lösen, key = gehashte IP |
| 🟡 | `backend/recipe/api/recipes.py:184`, `nutrition.py:83`, `core/api.py:150/159/177`, `content/api/ai.py:294` | Unauth → `401` statt dokumentiertem `403 "Anmeldung erforderlich"` | Auf 403-Pattern vereinheitlichen |
| 🟡 | `frontend-food/src/pages/planning/MealEventListPage.tsx:151-168` | `useEffect`-deps unvollständig (`copySource`,`createStartDatetime` fehlen) → Auto-Fill greift nicht | Deps ergänzen |
| 🟢 | `frontend/src/store/eventWizardStore.test.ts:86,87,200,206,213` | Test nutzt entferntes `group_id` (jetzt `invited_group_ids`) | Test aktualisieren |

### wrong-logic
| Sev | Ort | Ist-Verhalten | Warum falsch | Soll-Verhalten |
|-----|-----|---------------|--------------|----------------|
| 🔴 | `backend/recipe/services/nutrition_aggregation.py:131-145` | Standalone-Ingredient-Branch skaliert OHNE `× effective_portions` | Cockpit/Ampel zählt Energie/Protein um Faktor `effective_portions` zu niedrig; widerspricht Summary-Endpoint (`meal_plan.py:1179`) + Serializer (`meal_item_helpers.py:26`) | `× meal.effective_portions` wie Rezept-Branch |
| 🟠 | `backend/recipe/services/nutrition_aggregation.py:44-49` | Externe-Mahlzeit-Energie ist Pro-Person-Wert, wird aber als Total summiert | ~`effective_portions`× zu klein gegenüber internen Mahlzeiten | `× effective_portions` oder konsistent pro Person |
| 🟠 | `backend/recipe/models/rule.py:159-178` | Keine Validierung der Schwellen-Reihenfolge; nur `min_green`/`max_green` → nie „rot" unten erreichbar | Asymmetrische, irreführend milde Ampel; Config-Foot-Gun | `clean()` mit `min_yellow ≤ min_green ≤ max_green ≤ max_yellow` |
| 🟠 | `backend/supply/services/retail_section_mapping.py:206-210` | Bier/Sekt/Spirituose → „Getränke ohne Alkohol" | Falsche Warengruppen-Zuordnung (Drift zur Spec) | Auf „Alkoholische Getränke" mappen |
| 🟡 | `backend/planner/api/meal_plan.py:961` | `factor = round(item.factor * scale, 1)` | Kleine Faktoren (0.04, 0.13) → 0.0/0.1, Item verschwindet/verfälscht; Ziel-kcal verfehlt | Auf 2-3 Nachkommastellen runden |
| 🟡 | `backend/recipe/management/commands/normalize_recipe_portions.py:118-125` | Gemini-`quantity_g` ungeprüft übernommen (negativ/0/absurd) | Eine schlechte LLM-Antwort korrumpiert Rezept + Caches dauerhaft | Auf plausiblen Bereich clampen, ≤0 skippen |
| 🟡 | `backend/supply/services/shopping_service.py:304-320` vs `supply/utils.py:12-38` | Zwei Weight-Formatter mit unterschiedlichem Rundungsverhalten | Anzeige-Inkonsistenz Rezept vs. Einkaufsliste | Gemeinsamen Formatter nutzen |

### dead-code
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `frontend/src/api/collaborators.ts:9,10` | Ungenutzte Imports | Entfernen |
| 🟡 | `frontend/src/components/events/CalendarView.tsx:15` | Ungenutzter Import `isSameDay` | Entfernen |
| 🟡 | `frontend/src/components/events/dashboard/RoomAssignmentView.tsx:24` | Stray `createRoom`-Hook (Duplikat) | Entfernen |
| 🟡 | `frontend/src/components/shared/ShareDialog.tsx:40` | `user` nie gelesen | Entfernen oder nutzen |
| 🟢 | `backend/planner/meal_plan_api.py:1-5` | Backward-Compat-Shim (laut AGENTS.md nicht nötig) | Shim löschen, direkt aus `planner.api` importieren |
| 🟢 | 35× F401 unused-import (ruff) | Ungenutzte Python-Imports | `ruff --fix` |

### refactor
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟠 | `backend/session/api.py`, `blog/api.py`, `game/api.py` | ~85% identischer CRUD-Code (autocomplete, comments, materials, by-slug) | Generische Content-API-Factory in `content/base_api.py` |
| 🟢 | `frontend-food/src/pages/planning/RefMealEditorPage.tsx:185-202` | `CATEGORY_LABELS`/`getItemCategory` mid-render definiert (jedes Render neu) | Auf Modul-Ebene hochziehen |

### todo
| Sev | Ort | Marker | Notiz |
|-----|-----|--------|-------|
| 🟡 | `backend/recipe/api/recipes.py:74` | TODO | „Group recipes visible to group members" — siehe missing-impl |
| — | `seed_corporate_identity.py:49`, `profiles/tests/__init__.py:137`, `CorporateIdentityForm.tsx:259` | „XXX" | False positives (BIC `COBADEFFXXX`) — kein TODO |

### missing-impl
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `backend/recipe/api/recipes.py:66-97` | Docstring verspricht `visibility="group"`-Sichtbarkeit, Query behandelt sie nie | Group-Branch ergänzen oder Versprechen entfernen |

### missing-error
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🔴 | `backend/profiles/services/privacy.py:185-194` | DSGVO: `except Exception: pass` lässt PII bei Fehler un-anonymisiert | Nur `DoesNotExist` fangen, sonst `logger.exception` + re-raise |
| 🟠 | `backend/content/services/embedding_service.py:54,145,186,223` | 4× `except: pass` verwirft Embedding-Inhalte still | `logger.warning(exc_info=True)` |
| 🟠 | `frontend-food/src/pages/planning/TableView.tsx:289,305,322,622` | 4× leeres `catch {}` schluckt Fehler, kein Toast | `toast.error(...)` |
| 🟠 | `frontend/src/components/events/dashboard/ProgramEditor.tsx:525-540` | Raw `fetch` + `catch { /* silent */ }` | TanStack Query + Toast |
| 🟠 | `frontend/src/components/shared/ShareDialog.tsx:54-65` | Raw `fetch` + `import.meta.env.VITE_API_URL` statt `API_BASE_URL` | `API_BASE_URL` + Query-Hook |
| 🟡 | `backend/content/api/admin.py:308,313`, `featured.py:35`, `content_links.py:26`, `linking_service.py:373` | Generic-FK-Auflösung schluckt alle Exceptions → leere Titel | Erwartete Lookups fangen, Rest loggen |
| 🟡 | `backend/event/services/invitation_pdf.py:245-251` | Logo-Load `except: pass` → PDF ohne Logo, keine Diagnose | `logger.warning(exc_info=True)` |
| 🟡 | `frontend-food/src/components/recipe/InlineIngredientEditor.tsx:246,308,395,426,487` u.a. | Raw `fetch` in Komponenten statt Query-Hooks | Auf `src/api/*`-Hooks migrieren |

### risk
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🔴 | `frontend/src/components/events/dashboard/StatsView.tsx:262-285` | Food/Nährwert-UI im Haupt-Frontend (Architektur-Verstoß) | Nach `frontend-food/` verschieben |
| 🟠 | `backend/event/services/guest_registration.py:24-37` | Guest-Reg an bestehenden Account per E-Mail ohne Verifikation | Guest-only Person/Registration, keine Account-Wiederverwendung |
| 🟠 | `backend/content/api/helpers.py:273` + Filter-Schemas (`recipe/schemas/recipes.py:269`, `content/schemas/search.py:15`, blog/game/session) | `page_size` ohne `le=` → unbounded Queryset | `min(page_size, 100)` + `le=100` |
| 🟠 | `frontend/src/schemas/event.ts:66,141,460,474`, `profile.ts:19,34` | Nährwert-Schemas im Haupt-Frontend speisen verbotene Food-UI | Mit StatsView-Fix nach food verschieben |
| 🟡 | `backend/inspi/settings/base.py:20` | `SECRET_KEY` Default `"change-me-in-production"`, prod failt nicht fast | In `production.py` ohne Default erzwingen |
| 🟡 | `backend/core/services/gemini.py:144-148` | Nicht-atomares get/set Rate-Limit → Limit unter Last überschritten | `cache.incr()` |

### bad-practice
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | frontend-food: 19× `@typescript-eslint/no-explicit-any` (u.a. `NutritionBigTable.tsx:22`, `api/supplies.ts:92`, `IngredientDetailPage.tsx:465,475,838,841`, `RecipeSearchDialog.tsx:408,414`) | `any`/`as any` umgeht Typen | Typisierte Shapes/Error-Klassen |
| 🟡 | `frontend/src/pages/profile/MeineDatenPage.tsx:98,100,102,105` | 4× `(profile as any)` | Union-Typ narrowen |
| 🟡 | `frontend/src/components/events/dashboard/StatsView.tsx:267` | `Ernaehrung` statt `Ernährung` (Umlaut-Regel) | Echtes ä |
| 🟢 | backend 57× W293, 38× I001, 6× UP037, 4× UP017, 3× RUF046, … (ruff) | Whitespace/Imports/veraltete Idiome | `make lint-fix` + `make format` |
| 🟢 | food: 3× prefer-const, `input.tsx:5` empty-object-type, 2× irregular-whitespace (`TableView.tsx:673,676`) | Lint-Verstöße | `npm run lint -- --fix` + manuell |

### layout-inconsistency
| Sev | Ort | Abweichung | Soll-Komponente/Pattern |
|-----|-----|------------|-------------------------|
| 🟠 | `frontend-food/src/pages/planning/RefMealEditorPage.tsx:168,232-249` | Eigener `<button>←</button>`-Header + `container mx-auto` statt shared Hero/Wrapper | `BackButton` + `max-w-7xl …`-Wrapper |
| 🟠 | `frontend-food/src/pages/planning/RefMealEditorPage.tsx` (~18×) | Raw `<div className="border rounded-lg">` statt shadcn `Card` | `Card`/`CardContent` |
| 🟠 | `frontend-food/src/pages/recipes/MyRecipesPage.tsx:30,45,67,77` | Wrapper springt (`container py-8` vs `max-w-5xl …`); `max-w-5xl` ≠ Geschwister `max-w-7xl` | Einheitlicher Wrapper über alle States |
| 🟠 | `frontend-food/src/pages/admin/AdminPage.tsx:37`, `DataQualityPage.tsx:21` | `container py-6` = dritte Container-Konvention | Vereinheitlichen |
| 🟡 | `frontend-food/src/pages/tools/NormPortionSimulatorPage.tsx:526` | Eigener Wrapper-Variant für Top-Level-Tool | `ToolLandingPage`/shared Wrapper |
| 🟡 | `RefMealEditorPage.tsx:461`, `admin/AiFeedbackTab.tsx:94,95,128,135`, `RuleTab.tsx:19,21`, `RecipePreviewDialog.tsx:22-26` | Hardcoded `text-green-600`/`bg-red-500`/Hex statt Design-Tokens | Token-Klassen (`text-primary`, `--chart-*`, `--destructive`) |
| 🟢 | `frontend-food/src/pages/shopping/ShoppingListPage.tsx:129,157,192` | Unterschiedliche `py-*` über Loading/Empty/Loaded | Vereinheitlichen |

### missing-tests
| Sev | Ort (Funktion) | Risiko bei Fehler | Test-Vorschlag |
|-----|----------------|-------------------|----------------|
| 🔴 | `backend/recipe/models/rule.py:159` `Rule.evaluate()` | Inverted Operator kippt jede Nährwert-Ampel still | Table-Test über alle 4-Schwellen-Kombis an Grenzwerten |
| 🔴 | `backend/recipe/services/nutrition_aggregation.py:116-149` Standalone-Branch | `density`-Crash + Skalierungsfehler ungetestet | `MealItem(ingredient=…, unit="ml")`-Test mit erwarteter Energie |
| 🟠 | `nutrition_aggregation.py:44-49` Externe-Mahlzeit | Inkonsistente Aggregation unbemerkt | Externe vs interne Mahlzeit gleicher kcal vergleichen |
| 🟠 | `backend/supply/services/price_service.py:16` `get_portion_price` | Division-by-zero/None-Preis | Parametrisierter Null/Zero-Test → `None` |
| 🟠 | `backend/supply/utils.py:135-162` `build_package_display`/`get_shopping_portion` | Falsche Paket-Anzeige Einkaufsliste | `build_package_display(450, 500g)=="1×500g"` etc. |
| 🟡 | `backend/recipe/services/recipe_checks.py:342-432` `recalculate_recipe_cache` | Exchange-Alternativen evtl. fälschlich in Preis/Gewicht | Rezept mit Exchange-Alternative → Ausschluss prüfen |

### missing-integration-tests
| Sev | Endpoint / Flow | Risiko bei Fehler | Test-Vorschlag |
|-----|-----------------|-------------------|----------------|
| 🔴 | Cross-App: MealPlan → Shopping-List → Cost mit `override_portions` + ml-Ingredient + Override | Genau hier verstecken sich `density`-Crash + Skalierungs-Drift | E2E-Plan bauen, alle 3 Endpoints auf konsistente, endliche Zahlen prüfen |
| 🔴 | `normalize_recipe_portions` Command | Ungeprüfter LLM-Wert korrumpiert Prod-Rezepte | Mock `gemini_call` mit Out-of-Range → Clamp/Skip prüfen |
| 🟠 | `GET /{id}/cooking-schedule/` (`planner/api/meal_plan.py:2310`) | Auth-/Access-Pfad ungetestet | API-Test Viewer-Zugriff + Non-Collaborator 404 |
| 🟠 | MealPlan-Permission-Matrix (`_require_edit`/`_require_admin`, ~30 Endpoints) | Rechte-Lücken | Parametrisierter Rolle × Endpoint Test |
| 🟠 | `scale-to-target` (`meal_plan.py:932`) | Würde Rundungs-Bug §wrong-logic aufdecken | Skalierte Energie ≈ Ziel-kcal (Toleranz) asserten |
| 🟡 | `seed_all`/`seed_rules` Schwellen-Ordering, `generate-embeddings` | Ungültige Rule-Schwellen, Embedding-Drift | Idempotenz + Threshold-Ordering asserten |
| 🟡 | Breakfast-Calc Konstanten-Sync (`breakfastCalc.ts:12` `2335` vs `dge_reference.py`) | Drift Backend↔Frontend | Backend-Test Konstante + Vitest `rebalanceShares` Summe=100 |

---

## OpenSpec — letzte 10 Specs

Geprüft: 9 aktive Changes unter `openspec/changes/` + zuletzt geänderte Spec `portion-reorder-fix`. Alle 9 Changes haben **0 erledigte Tasks** (proposed, nicht implementiert).

| Spec / Change | Zusammenfassung | Status | Lücken |
|---------------|-----------------|--------|--------|
| `smart-meal-plan-duplicate` | Tag-basierter Duplicate-Algorithmus statt Offset; `start_datetime` Pflicht, `end_datetime`, Meta `meals_copied` | Missing | Offset-Algo unverändert; `start_datetime` weiter `null=True`; keine Meta-Felder |
| `fix-ai-suggest-routing` | AI-Endpoint unter `/meal-plans/ai/suggest/`, Router-Reihenfolge, `int`-Converter | Missing | Pfad weiter `/ai-suggest/`; Router weiter zuerst |
| `nutrition-min-only-bar-display` | Reine Untergrenzen-Nährstoffe als Mindest-Schwelle statt Soll-Säule | Missing | Chart setzt `mid = min` (Soll-Säule) weiter |
| `recipe-edit-in-cooking-quantities` | Eigener Einstieg „Für X Personen bearbeiten", Normierung auf 1 Portion | Partial | Skalier-Logik da, aber an `portionsMultiplier > 1` gekoppelt — kein Einstieg |
| `shopping-list-reserve-breakdown` | Reserve-Anteil getrennt (`net_quantity_g`/`reserve_quantity_g`) | Missing | Keine Felder in Backend/Zod; keine Anzeige |
| `retail-sections-restructure` | Einheitlicher Warengruppen-Katalog (SSOT), Alkohol-Trennung | Drifted | Alkohol → „Getränke ohne Alkohol"; kein `data/retail_sections.py` |
| `meal-plan-arrival-day-and-refmeal-sync` | Event-Default-Zeiten 17:00/11:00, Skip nutzt `meal_default_times`, RefMeal-Auto-Sync | Partial | Event setzt `00:00`; Skip hartkodiert; `update_ref_meal` synct nicht |
| `url-import-error-messages` | Differenzierte `error_code`-Fehler mit korrektem HTTP-Status | Missing | Endpoint maskiert alles als generisches 422 |
| `ingredient-naming-quality` | `IngredientAlias.is_generic`, partielle Unique-Constraint, Plural-Matching | Missing | Kein `is_generic`; alte Constraint; keine Stemming-Dependency |
| `portion-reorder-fix` (spec) | Reorder schließt g-Portion (rank 9999) aus | Done | — (`IngredientDetailPage.tsx:525`) |

**Spec-Mismatch-Findings (echte Drift):**
- 🟠 `retail-sections-restructure`: Alkohol-Fehlzuordnung — `backend/supply/services/retail_section_mapping.py:206-210` (Code widerspricht Spec aktiv)
- 🟠 `smart-meal-plan-duplicate`: Offset-Algo statt Tag-Index — `backend/planner/api/meal_plan.py:450,487-488`
- 🟠 `url-import-error-messages`: pauschales 422 — `backend/recipe/api/recipes.py:244-247`
- 🟡 `meal-plan-arrival-day-and-refmeal-sync`: 3 Teil-Lücken — `meal_plan.py:315-316`, `models/meal_plan.py:221`, `ref_meal.py:155-181`
- 🟡 `recipe-edit-in-cooking-quantities` — `frontend-food/.../RecipeDetailPage.tsx:779`
- 🟡 `nutrition-min-only-bar-display` — `frontend-food/src/components/charts/NutrientBalanceChart.tsx:71`

**Systemisches Finding:**
- 🟡 `openspec validate --all` = **170/211 fail** — eine Ursache: den meisten `spec/`-Dateien fehlen `## Purpose`/`## Requirements`; einige Changes haben nur Platzhalter-Deltas. Kein 170-faches Einzelproblem. Hebel: Purpose-Sections ergänzen.

---

## Sichere Auto-Fixes (Vorschlag)
- [ ] **Backend ruff `--fix`**: 134 auto-fixbare Fehler (unused imports F401, unsorted imports I001, whitespace W293, UP037/UP017, f-string, SIM118/910) → `cd backend && uv run ruff check . --fix && uv run ruff format .`
- [ ] **Food ESLint `--fix`**: 3 auto-fixbare (prefer-const, irregular whitespace)
- [ ] **Frontend ungenutzte Imports** entfernen: `collaborators.ts:9,10`, `CalendarView.tsx:15`, `RoomAssignmentView.tsx:24`, `ShareDialog.tsx:40`
- [ ] **Umlaut-Fix**: `StatsView.tsx:267` `Ernaehrung` → `Ernährung`

## Manuelle Fixes (nur mit Freigabe — verändern Verhalten/Contracts)
- 🔴 `ingredient.density` → `physical_density` (2 Stellen) + Test
- 🔴 `usePermissions` auf `is_staff` umstellen (Achtung: braucht ggf. Admin-Flag im Backend-Schema)
- 🔴 Standalone-Ingredient-Skalierung vereinheitlichen (`× effective_portions`) + Test
- 🔴 7× React-Hooks-Order beheben (RefMealEditorPage, DataDistributionsPage)
- 🔴 DSGVO `anonymize()` Exception-Handling
- 🔴 Food-UI aus Haupt-Frontend entfernen (StatsView `NutritionSection`)
- 🟠 Guest-Registration-Account-Hijack, `page_size`-Cap, Rule-Schwellen-Validierung, Alkohol-Mapping, externe-Mahlzeit-Skalierung
- Schema-Sync: `quality_score`(+`_updated_at`) im Content-Base-Zod ergänzen; `PortionSuggestionSchema.measuring_unit_name` optional; Phantom-Vitamin-Felder in `supply.ts` entfernen; `usage_count`/`source_url` ergänzen

---

## Schema-Sync Detail (Pydantic ↔ Zod)
| Sev | Backend | Frontend | Problem | Fix |
|-----|---------|----------|---------|-----|
| 🟠 | `ContentListOut/DetailOut.quality_score: int\|None` (`content/schemas/base.py:96,145`) | fehlt in `frontend` + `frontend-food` `content.ts` | Feld still verworfen über ALLE Content-Typen | `quality_score: z.number().int().nullable().optional()` beidseitig |
| 🟠 | `IngredientDetailOut` liefert nur `vitamin_c_mg` (`supply/schemas/ingredients.py:142`) | `supply.ts:214-240` deklariert ~25 Phantom-Vitamin/Mineral-Felder | Tote Felder (Backend liefert nie) | Entfernen oder Backend ergänzen |
| 🟠 | `PortionSuggestionOut` ohne `measuring_unit_name` (`ingredients.py:351-356`) | `PortionSuggestionSchema.measuring_unit_name: z.string()` (required, `supply.ts:367`) | Harte Zod-Parse-Failure bei AI-Portion-Vorschlägen | Optional machen oder Backend-Feld ergänzen |
| 🟡 | `ContentDetailOut.quality_score_updated_at` (`base.py:146`) | fehlt beidseitig | — | `z.string().nullable().optional()` |
| 🟡 | `RecipeListOut.source_url` (`recipes.py:51`) | fehlt in `RecipeListItemSchema` (`recipe.ts:65-86`) | — | ergänzen |
| 🟡 | `IngredientListOut.usage_count` (`ingredients.py:96`) | fehlt in `IngredientListItemSchema` (`supply.ts:155`) | — | `z.number().default(0)` |
| 🟡 | `standalone_type` | `supply.ts:244` (Phantom) | Backend kennt Feld nicht | aus Zod entfernen |
| 🟡 | `RecipeSuggestAllOut` ohne `ai_interaction_id` (`recipes.py:308`) | — | Verstößt gegen AGENTS.md-Konvention | Klären/ergänzen |

> Kern-Food-Pipeline (MealPlan/Meal/Recipe/Rule/Ingredient-List) ist tight synced. Die zwei kritischsten: fehlendes `quality_score` (still verworfen) und required `measuring_unit_name` (harte Parse-Failure).
