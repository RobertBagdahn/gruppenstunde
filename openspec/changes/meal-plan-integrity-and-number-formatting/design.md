## Context

Ist-Zustand auf `main` (Abgleich 27.09.2026):

**Mahlzeiten**
- `backend/planner/models/meal_plan.py` `Meal.Meta.constraints` enthält nur `unique_ref_meal_per_plan_and_type`. `Meal.clean()` prüft die Eindeutigkeit regulärer Mahlzeiten und wird von `save()` aufgerufen.
- Alle Erzeugungspfade laufen über `save()`:
  - `planner/models/meal_plan.py:238, 296` (`get_or_create`)
  - `planner/api/meal_plan.py:676` (Duplizieren), `:866` (`add_meal`)
  - `planner/api/ref_meal.py:126`
  - `planner/services/meal_plan_ai_service.py:643`
  Kein `bulk_create`.
- Lokale Daten: 0 doppelte reguläre Mahlzeiten, 1 Referenzmahlzeit mit Datum (#167), 1 Mahlzeit außerhalb des Zeitraums (#168).
- `planner/schemas/meal_plan.py:251` (`MealItemCreateIn.quantity`) und `:879` (`RefMealItemIn.quantity`) sind `float | None`. Ein Zutaten-Eintrag ohne Menge existiert lokal einmal.
- `GET /api/meal-plans/{id}/` liefert Referenzmahlzeiten in `meals` mit.
- Plan-Check (`planner/api/meal_plan.py:1395`) kennt `allergen_conflict`, `budget_excess`, `empty_slot`, `open_budget`, `suggest_recipe`.
- `MEAL_TYPE_TO_RECIPE_TYPES` (`meal_plan.py:1917`) steuert die Rezeptsuche je Mahlzeit.

**Frontend (Essensplan)**
- `frontend-food/src/components/planning/MealPlanBudgetCockpit.tsx:206`: fest verdrahtetes „Ziel: 2.000“; `NORM_PERSON_DAILY_KCAL = 2335` existiert in `src/schemas/mealPlan.ts:642`.
- `getCoverageBadge()` (`src/schemas/mealPlan.ts`) liefert „Vollständig“/„Teilweise“; `pages/planning/MealSlot.tsx:340` zeigt „Essen reicht nicht“.
- `pages/planning/DayPlanView.tsx:255` gruppiert nach `MEAL_TYPE_ORDER` statt nach Uhrzeit.

**Formatierung**
- Backend-Texte:
  - `supply/services/shopping_service.py:326` (`_format_natural_portion` → „ca. 64.7 TL“), `:400` (`compute_portion_options` → `display`)
  - `shopping/schemas.py:78–148` (`display_quantity`, `natural_portions`)
  - `planner/schemas/meal_plan.py` (`portion_display`)
- `supply/utils.py:12` (`format_weight`, ohne Leerzeichen, `round()` = Bankers-Rounding bei 1–49 g) und `frontend-food/src/utils/formatWeight.ts` (mit Leerzeichen, `Math.round`).
- 141 `toFixed()` in `.tsx`; lokale `formatPrice`/`formatNumber` in `components/recipe/UnitSwitcher.tsx`, `components/planning/MealOmnibarDialog.tsx`, `components/supply/IngredientList.tsx`, `components/ingredient/PriceProposalCard.tsx`, `components/ingredient/IngredientCard.tsx`, `components/data-quality/PriceAnalysisTable.tsx`, `pages/ingredients/IngredientDetailPage.tsx`, `lib/unitConversion.ts`.
- `components/shared/ListPageHero.tsx:64` pluralisiert nur das Standard-Label.

## Goals / Non-Goals

**Goals:**
- Datenbankseitig abgesicherte Mahlzeiten-Integrität, ohne Altdaten zu zerstören.
- Plan-Check macht Integritäts- und Plausibilitätsprobleme sichtbar.
- Eine Formatierungsquelle im Frontend; das Backend liefert Zahlen.
- Front- und Backend runden identisch.

- Einkauf in kaufbaren Packungen und Flüssigkeiten in Litern, auf Basis freigegebener KI-Vorschläge.
- Token-System mit AA-Kontrast, einer Schrift- und Radius-Skala und ausschließlich Lucide-Icons, per ESLint durchgesetzt.

**Non-Goals:**
- Dark Mode (Tokens werden vorbereitet).
- Tabellenlayout der Listen, Neuordnung der Rezeptdetailseite.
- Automatisches Verschieben oder Löschen von Mahlzeiten außerhalb des Zeitraums.

## Decisions

1. **Referenzmahlzeiten ohne Datum per CheckConstraint** `CheckConstraint(condition=Q(is_reference=False) | Q(start_datetime__isnull=True, end_datetime__isnull=True), name="meal_reference_without_datetime")`. Die Migration setzt bei `is_reference=True` beide Felder auf `NULL` (verlustfrei, weil Referenzmahlzeiten fachlich datumslos sind).

2. **UniqueConstraint mit Ausdruck** `UniqueConstraint(TruncDate("start_datetime"), "meal_plan", "meal_type", condition=Q(is_reference=False) & ~Q(meal_type="snack"), name="unique_regular_meal_per_day_and_type")`. `TruncDate` nutzt wie `clean()` (`start_datetime__date`) die aktive Zeitzone. Die Migration prüft vorab auf Konflikte und bricht mit einer Liste ab, statt Daten zu löschen. Alternative „nur `clean()`“ verworfen: `.update()` und künftige `bulk_create` würden sie umgehen.

3. **Bereichsprüfung in `Meal.clean()`, nur bei Neuanlage oder Datumsänderung.** `clean()` vergleicht `start_datetime.date()` mit `meal_plan.start_datetime.date()`/`end_datetime.date()` (keine Zusatzabfrage, `meal_plan` ist geladen). Die Datumsänderung wird über einen im `__init__` gemerkten Originalwert erkannt. So bleibt #168 bearbeitbar. Kein DB-Constraint, weil eine Plan-übergreifende Prüfung in Postgres einen Trigger bräuchte. Vereinbar mit `meal-plan-contiguity` („Meal-level CRUD does not validate contiguity“): geprüft wird der Zeitraum, nicht die Lückenlosigkeit.
   - `ValidationError` wird in den Endpunkten auf HTTP 400 mit deutscher Meldung abgebildet (zentral in einem Helper `_save_meal_or_400`).

4. **Pflichtmenge per Pydantic-Validator.** `model_validator(mode="after")` auf `MealItemCreateIn`, `RefMealItemIn` und den Assistenten- und Buffet-Eingaben: `ingredient_id` gesetzt ⇒ `quantity > 0`. Kein DB-Constraint, weil Altdaten ohne Menge nicht automatisch befüllbar sind. Sie werden stattdessen über `missing_quantity` im Plan-Check sichtbar.

5. **Referenzmahlzeiten getrennt.** `MealPlanDetailOut.meals` filtert `is_reference=False`; neues Feld `ref_meals: list[RefMealOut]` (gleiches Schema wie `GET …/ref-meals/`). Das Frontend nutzt `ref_meals` für die Referenz-Chips und verliert den Tag „1. Januar“. Zod `MealPlanDetailSchema` wird angepasst.

6. **Plan-Check-Regeln** in `planner/services/plan_check.py` (Extraktion aus dem Endpunkt, je Regel eine Funktion):
   - Neue Mapping-Konstante `PLAUSIBLE_RECIPE_TYPES_BY_MEAL` (siehe Spec); bewusst getrennt von `MEAL_TYPE_TO_RECIPE_TYPES`, das die Suche steuert und `dessert` ausschließt.
   - Aktionen als Frontend-Deep-Links (Mahlzeit öffnen, Tauschen-Dialog, Einstellungen).
   - `PlanCheckAlertOut.type` wird ein `Literal` mit allen Typen; Zod als `z.enum`.

7. **Labels und Ziel im Frontend:**
   - `getCoverageBadge()` liefert die neuen Labels.
   - `MealSlot` zeigt „Zu wenig Energie (x %)“ bzw. nichts bei ausreichender Energie („Energie ok“ nur im Tooltip, um Rauschen zu vermeiden).
   - Das Cockpit nutzt `NORM_PERSON_DAILY_KCAL` und `formatNumber`.

8. **Sortierung** in `DayPlanView` und `TableView`: `sort((a, b) => time(a) - time(b) || typeIndex(a) - typeIndex(b))`; die Gruppierung nach Typ entfällt in der Tagesansicht.

9. **`lib/format.ts` als einzige Quelle:**
   - `Intl.NumberFormat('de-DE')` mit gecachten Formattern.
   - `formatWeight` zieht aus `utils/formatWeight.ts` um; die alte Datei re-exportiert nicht (keine Rückwärtskompatibilität nötig), Importe werden angepasst.
   - `plural(count, singular, pluralForm)` gibt „{formatCount(count)} {Wort}“ zurück.
   - `ListPageHero` erhält `countLabel: { one: string; other: string }`.

10. **Backend liefert Zahlen:**
    - `ShoppingListItemOut`: `quantity_g: float`, `unit: "g" | "ml"`, `piece_equivalent: {count: float, portion_name: str} | None`, `package_options: list[{count: float, package_name: str, weight_g: float}]`.
    - `compute_portion_options` liefert `count`/`name`/`weight_g` ohne `display`.
    - `MealItemOut`: `portion_display` entfällt zugunsten von `portion_name` + `portion_count` + `quantity_g`.
    - `_format_natural_portion` entfällt aus der API-Nutzung und wird nur noch vom PDF-Export über eine Formatierungsfunktion mit identischen Regeln genutzt (`supply/utils.py`).

11. **Backend-Rundung:** `format_weight` nutzt `math.floor(x + 0.5)` in allen Stufen und ein Leerzeichen vor der Einheit. Eine gemeinsame Testtabelle (JSON-Fixture `backend/supply/tests/fixtures/format_weight_cases.json`) wird von pytest und vitest gelesen und sichert die Gleichheit.

12. **ESLint:** In `frontend-food/eslint.config.js` wird `no-restricted-syntax` auf `CallExpression[callee.property.name='toFixed']` für `**/*.tsx` gesetzt (Fehler). Tests (`*.test.tsx`) sind ausgenommen.

13. **Packungsrechnung** in `supply/utils.py`:
    - `compute_package_need(quantity, package) -> (count, surplus)` mit 5 %-Toleranz (`exact - floor(exact) <= 0.05` ⇒ abrunden, min. 1).
    - `get_shopping_portion` bleibt Quelle (`Package`, `rank=1`).
    - Die bisherige Stringbildung `build_package_display` entfällt (Frontend formatiert).
    - Spec `shopping-list-package-display` wird auf diese Quelle umgestellt, weil Portions-Ableitungen („Glas Milch 200 g“) Rauschen erzeugen.

14. **Flüssigkeiten:** Neuer Wert `liquid` in `PhysicalViscosityChoices` (Migration nur Choices). Einkaufsposten mit `beverage`/`liquid` liefern `quantity` in ml (`g / physical_density`) und `unit="ml"`. Das Frontend zeigt ab 1.000 ml Liter.

15. **Packungsvorschläge** als eigenes Model `IngredientPackageSuggestion` (ingredient, package_name, weight_g, volume_ml, viscosity, density, confidence, status pending/accepted/rejected, created_at):
    - Nutzt den Batch-Runner aus `supply/services/data_offensive.py` (15 Zutaten je Aufruf, `DEFAULT_TEXT_MODEL`) mit eigenem Prompt: übliche deutsche Handelsgröße, JSON-Schema.
    - API unter `/api/admin/data-quality/offensive/packages/` (Staff): `POST …/suggest` (mit Kostenschätzung und Trockenlauf), `GET …/` (paginiert, Filter), `POST …/accept` / `…/reject` (Einzel und Bulk).
    - Übernahme legt `Package(rank=1)` an und setzt Viskosität und Dichte nur, wenn die Werte nicht manuell gepflegt sind (Herkunftsfeld `viscosity_source` analog `retail_section_source`).
    - Frontend: neuer Tab „Packungen“ im Cockpit (`pages/admin/DataOffensivePage.tsx`).

16. **Token-Werte** in `src/index.css`:
    - Abgedunkelte `--primary`, `--danger` (ersetzt `--destructive`, Alias bleibt für shadcn-Komponenten) sowie `--success`, `--warning`, `--info` mit `-soft`, `-border`, `-foreground`.
    - `tailwind.config.ts` bildet sie ab.
    - `src/lib/contrast.test.ts` liest `index.css`, berechnet WCAG-Kontraste und prüft alle definierten Paare.

17. **Schrift- und Radius-Skala** in `tailwind.config.ts`:
    - `fontSize` wird auf die fünf Tokens `caption` (12), `body` (14), `emphasis` (16), `section` (20), `title` (28) reduziert (Tailwind-Standardgrößen werden überschrieben).
    - `borderRadius` wird auf `lg` (8 px), `xl` (12 px) und `full` begrenzt.
    - Migration per Codemod-Skript (`frontend-food/scripts/migrate-tokens.mjs`) mit Mapping-Tabelle, danach manuelle Sichtprüfung im Styleguide und auf den Kernseiten (Desktop und 375 px).

18. **Farb-Migration:** Mapping-Tabelle Palette → Token (z. B. `amber-50` → `warning-soft`, `red-600` → `danger`, `gray-100` → `muted`, `emerald-*` → `success`); dieselbe Codemod-Datei, Rest manuell.

19. **Icons:**
    - Codemod ersetzt `<span className="material-symbols-…">name</span>` anhand einer Mapping-Tabelle (80 Namen → Lucide) durch Lucide-Komponenten mit Größen-Token.
    - Eine Komponente `components/ui/icon.tsx` kapselt Größe (16/20/24/48) und `strokeWidth=2`.
    - Die Icon-Schrift wird aus `index.html` entfernt.
    - Namen ohne gutes Lucide-Pendant werden in der Mapping-Tabelle dokumentiert.

20. **ESLint-Regeln** (`frontend-food/eslint.config.js`, lokale Regel `food/design-tokens`):
    - prüft `className`-Strings und `cn()`/`clsx()`-Argumente auf Palettenfarben, `text-[…]`, nicht erlaubte Größen und Radien sowie `material-symbols`.
    - `no-restricted-syntax` verbietet `toFixed`.
    - Ausnahmen: `*.test.tsx` und `pages/StyleguidePage.tsx`.

## Risks / Trade-offs

- [UniqueConstraint schlägt auf Prod wegen vorhandener Dubletten fehl] → Die Migration prüft vorab und bricht mit einer Liste ab; im Runbook steht ein Trockenlauf-Befehl `check_meal_integrity`, der Dubletten, Referenzmahlzeiten mit Datum und Mahlzeiten außerhalb des Zeitraums meldet.
- [Zeitzonen-Grenzfälle bei `TruncDate`] → Gleiche Semantik wie `clean()`; die Standard-Uhrzeiten liegen tagsüber.
- [Breaking-API-Änderung für Anzeigefelder] → Nur `frontend-food` konsumiert sie (Haupt-Frontend enthält keine Food-Seiten laut `AGENTS.md`); Zod- und Pydantic-Schemas werden im selben Change angepasst.
- [141 mechanische Ersetzungen] → Die Lint-Regel findet vergessene Stellen; Snapshot- und Unit-Tests der betroffenen Komponenten laufen mit.
- [Plan-Check wird lauter] → `recipe_type_mismatch` und `empty_day` sind Hinweise (nicht Warnungen) und werden im Flyout nach den Warnungen einsortiert.

- [KI-Packungsvorschläge sind falsch (z. B. Gastro-Größen)] → Nur Vorschläge; Übernahme erst nach Freigabe, Bulk nur ab Konfidenz-Schwelle; manuelle Werte haben Vorrang.
- [Token-Migration über ~120 Dateien verändert das Aussehen breit] → Codemod mit Mapping-Tabelle, Styleguide als Referenz, Screenshot-Vergleich der Kernseiten (Desktop und 375 px) vor dem Merge.
- [Tailwind-Standardgrößen werden überschrieben] → shadcn-Basiskomponenten (`components/ui/*`) im selben Schritt anpassen; die Lint-Regel findet Reste.
- [Change wird groß] → Umsetzung in der Task-Reihenfolge; jede Gruppe ist einzeln lauffähig und getestet (Integrität → Format → Einkauf → Tokens → Icons).

## Migration Plan

0. Supply-Migrationen: Viskosität `liquid`, Model `IngredientPackageSuggestion`, Feld `viscosity_source`.
1. Planner-Migration: `RunPython` (Referenzmahlzeiten ohne Datum; Konfliktprüfung für die Eindeutigkeit) → `AddConstraint` ×2.
2. Lokal testen, danach Aufnahme ins gesammelte Prod-Runbook:
   - `check_meal_integrity` (Trockenlauf) auf Prod → Ergebnis prüfen → Deploy mit Migration.
   - Packungsvorschläge auf Prod erst nach dem Deploy, im Cockpit mit Kostenanzeige, Freigabe durch Staff.
3. Rollback: Constraints entfernen (Reverse-Migration); die entfernten Datumswerte von Referenzmahlzeiten werden nicht wiederhergestellt (fachlich bedeutungslos).

## Open Questions

Keine.
