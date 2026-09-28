## 1. Backend: Mahlzeiten-Integrität (Model und Migration)

- [x] 1.1 `backend/planner/models/meal_plan.py`: CheckConstraint `meal_reference_without_datetime` und UniqueConstraint `unique_regular_meal_per_day_and_type` (TruncDate, Bedingung ohne Referenz/Snack)
- [x] 1.2 `Meal.clean()`: Bereichsprüfung gegen Plan-Start/-Ende nur bei Neuanlage oder geändertem `start_datetime` (Originalwert in `__init__` merken)
- [x] 1.3 Migration: `RunPython` (Referenzmahlzeiten → Datum/Uhrzeit `NULL`; Vorabprüfung auf doppelte reguläre Mahlzeiten mit Abbruchliste) → `AddConstraint` ×2
- [x] 1.4 Management-Befehl `check_meal_integrity` (nur Bericht): Dubletten, Referenzmahlzeiten mit Datum, Mahlzeiten außerhalb des Zeitraums, Zutaten-Einträge ohne Menge
- [x] 1.5 Tests: Constraints greifen; Migration leert Datum der Referenzmahlzeit ohne Datenverlust; bestehende Mahlzeit außerhalb bleibt bearbeitbar; neue außerhalb → `ValidationError`

## 2. Backend: API und Schemas (Pydantic)

- [ ] 2.1 Helper `_save_meal_or_400` und Nutzung in `add_meal`, Duplizieren, Referenz-/Assistenten-/Buffet-/KI-Pfaden (HTTP 400 mit deutscher Meldung)
- [ ] 2.2 `planner/schemas/meal_plan.py`: `model_validator` Pflichtmenge für Zutaten in `MealItemCreateIn`, `RefMealItemIn`, Assistenten- und Buffet-Eingaben
- [ ] 2.3 `MealPlanDetailOut`: `meals` nur regulär, neues Feld `ref_meals`
- [ ] 2.4 Tests: 400 bei zweitem Frühstück und außerhalb des Zeitraums, 422 bei Zutat ohne Menge, 403 anonym, Detail-API ohne Referenzmahlzeit in `meals`

## 3. Backend: Plan-Check

- [ ] 3.1 `planner/services/plan_check.py`: bestehende Regeln aus dem Endpunkt extrahieren
- [ ] 3.2 Neue Regeln `recipe_type_mismatch` (`PLAUSIBLE_RECIPE_TYPES_BY_MEAL`, leere Typen und `recipe_part` ausgenommen), `missing_quantity`, `meal_outside_range`, `empty_day`
- [ ] 3.3 `PlanCheckAlertOut.type` als `Literal` aller Typen
- [ ] 3.4 Tests je Regel inkl. Viewer (Hinweise ohne Aktionen) und anonym (403)

## 4. Backend: Formatierung und strukturierte Anzeigefelder

- [ ] 4.1 `supply/utils.py` `format_weight`: kaufmännisches Runden in allen Stufen, Leerzeichen vor der Einheit; `format_exact_weight` ergänzen
- [ ] 4.2 Gemeinsame Testtabelle `backend/supply/tests/fixtures/format_weight_cases.json` + pytest
- [ ] 4.3 `supply/services/shopping_service.py`: `compute_portion_options` liefert `count`/`name`/`weight_g`, kein `display`; `_format_natural_portion` nur noch für PDF
- [ ] 4.4 `shopping/schemas.py`: `display_quantity`/`natural_portions` → `quantity_g`, `unit`, `piece_equivalent`, `package_options`
- [ ] 4.5 `planner/schemas/meal_plan.py`: `portion_display` → `portion_name`, `portion_count`, `quantity_g` (MealItem und Einkaufsansicht des Plans)
- [ ] 4.6 `planner/services/pdf_export.py` auf die neue Backend-Formatierung umstellen
- [ ] 4.7 Tests: API liefert Zahlen statt Texte; PDF enthält „≈ 2,5 Stück“ mit Komma

## 5. Frontend (frontend-food): Formatierungsmodul

- [ ] 5.1 `src/lib/format.ts` mit `formatNumber`, `formatEuro`, `formatWeight`, `formatExactWeight`, `formatCount`, `plural`; `utils/formatWeight.ts` entfernen und Importe umstellen
- [ ] 5.2 Vitest für `format.ts`, liest dieselbe Testtabelle `format_weight_cases.json`
- [ ] 5.3 ESLint `no-restricted-syntax` gegen `toFixed` in `**/*.tsx` (Tests ausgenommen)
- [ ] 5.4 Alle 141 `toFixed`-Stellen und die lokalen `formatPrice`/`formatNumber`-Kopien ersetzen
- [ ] 5.5 `ListPageHero`: `countLabel: {one, other}`; Aufrufer (Rezepte, Zutaten, Pläne, Listen, Meine Rezepte) anpassen
- [ ] 5.6 Definierte Portionsgewichte mit `formatExactWeight` (Rezept-Zutatenliste, Portionsauswahl, Zutatendetail)

## 6. Frontend (frontend-food): Schemas (Zod)

- [ ] 6.1 `src/schemas/shoppingList.ts`: neue strukturierte Felder, alte Textfelder entfernen
- [ ] 6.2 `src/schemas/mealPlan.ts`: `ref_meals`, strukturierte MealItem-Felder, `PlanCheckAlertType` als `z.enum`
- [ ] 6.3 Portions-Options-Schema in `src/schemas/supply.ts` ohne `display`
- [ ] 6.4 Contract-Tests in `src/schemas/contractSchemas.test.ts` ergänzen

## 7. Frontend (frontend-food): Essensplan-UI

- [ ] 7.1 `MealPlanBudgetCockpit.tsx`: Ziel aus `NORM_PERSON_DAILY_KCAL`, Zahlen über `format.ts`
- [ ] 7.2 `getCoverageBadge()` mit den neuen Labels; `MealSlot.tsx` „Zu wenig Energie (x %)“
- [ ] 7.3 `DayPlanView.tsx`/`TableView.tsx`: Sortierung nach Uhrzeit, Referenz-Chips aus `ref_meals`
- [ ] 7.4 `PlanCheckFlyout.tsx`: neue Typen mit Aktionen (Deep-Links), Warnungen vor Hinweisen, Viewer ohne Aktionen
- [ ] 7.5 `ShoppingView.tsx`, `pages/shopping/ShoppingListDetailPage.tsx`: Anzeige aus strukturierten Feldern („320 g · ≈ 64 TL“)
- [ ] 7.6 Vitest: Labels, Sortierung, Cockpit-Ziel, Plan-Check-Rendering, Einkaufsanzeige

## 8. Backend: Einkauf in Packungen und Litern

- [ ] 8.1 `supply/choices.py`: `PhysicalViscosityChoices.LIQUID`; Feld `viscosity_source` am Ingredient; Migration
- [ ] 8.2 `supply/utils.py`: `compute_package_need()` (5 %-Toleranz, min. 1), `build_package_display` entfernen
- [ ] 8.3 Einkaufsposten: `package_options`, `package_surplus_g`, `quantity`/`unit` (ml für `beverage`/`liquid` über `physical_density`) in `shopping/schemas.py` und der Essensplan-Einkaufsansicht
- [ ] 8.4 Tests: 1.020 g/500 g → 2, 700 g/250 g → 3 (+50 g), 30 g → 1; Milch 9.400 g → 9.126 ml; feste Zutat bleibt g

## 9. Backend: Packungsvorschläge per KI

- [ ] 9.1 Model `IngredientPackageSuggestion` + Migration
- [ ] 9.2 Service im Batch-Runner (`supply/services/data_offensive.py`): Auswahl genutzter Zutaten ohne Standardpackung, Prompt mit JSON-Schema, Kostenschätzung, Trockenlauf
- [ ] 9.3 API `/api/admin/data-quality/offensive/packages/`: suggest, list (paginiert, Filter Konfidenz/Warengruppe/Status), accept/reject einzeln und Bulk (ab Konfidenz-Schwelle); nur Staff
- [ ] 9.4 Übernahme: `Package(rank=1)` anlegen, Viskosität/Dichte nur ohne manuelle Herkunft setzen
- [ ] 9.5 Tests mit gemocktem Gemini: Auswahl, Kostenschätzung, Staff/Nicht-Staff/anonym, keine Überschreibung manueller Werte, Idempotenz

## 10. Frontend: Einkauf und Packungs-Cockpit

- [ ] 10.1 Zod: Einkaufsfelder (`package_options`, `package_surplus_g`, `unit`), `IngredientPackageSuggestion`-Schema
- [ ] 10.2 Einkaufszeile: „1.020 g · 2 × 500-g-Packung“, Reserve-Zeile, Liter-Anzeige ab 1.000 ml
- [ ] 10.3 Cockpit-Tab „Packungen“ (`pages/admin/DataOffensivePage.tsx`): Kostenanzeige, Lauf starten, Liste mit Filtern im URL-State, Einzel-/Bulk-Freigabe, Bearbeiten
- [ ] 10.4 Vitest: Einkaufszeile, Freigabe-Flow

## 11. Frontend: Design-Tokens

- [ ] 11.1 `src/index.css`: AA-Werte für Primär/Danger/Warning; `--success`, `--warning`, `--info`, `--danger` mit `-soft`, `-border`, `-foreground`; `--destructive` als Alias
- [ ] 11.2 `tailwind.config.ts`: Status-Farben, `fontSize` = `caption`/`body`/`emphasis`/`section`/`title`, `borderRadius` = `lg`/`xl`/`full`
- [ ] 11.3 `src/lib/contrast.test.ts`: WCAG-Kontrast aller Token-Paare
- [ ] 11.4 Codemod `frontend-food/scripts/migrate-tokens.mjs` (Palette → Token, Schriftgrößen → Skala, Radien → 3 Stufen) ausführen, Reste manuell
- [ ] 11.5 `components/ui/*` (shadcn) an Skala und Radien anpassen
- [ ] 11.6 `chart-*`-Nutzungen außerhalb von Diagrammen auf Status-Tokens umstellen
- [ ] 11.7 Styleguide-Seite aktualisieren (Farben mit Kontrastwerten, Skala, Radien, Icons)

## 12. Frontend: Icons

- [ ] 12.1 `components/ui/icon.tsx` (Größen 16/20/24/48, `strokeWidth=2`)
- [ ] 12.2 Mapping-Tabelle der 80 Material-Symbols-Namen auf Lucide; Codemod über die 60 Dateien
- [ ] 12.3 Icon-Schrift aus `index.html` entfernen; grep auf `material-symbols` = 0
- [ ] 12.4 `frontend-food/AGENTS.md` und Styleguide: Regel „nur Lucide, 16/20/24/48 px“

## 13. Frontend: ESLint-Durchsetzung

- [ ] 13.1 Lokale Regel `food/design-tokens` (Palettenfarben, `text-[…]`, Größen außerhalb der Skala, Radien, `material-symbols`) für `className`, `cn()`, `clsx()`; Ausnahmen Tests und Styleguide
- [ ] 13.2 Regel-Tests (RuleTester) und `npm run lint` ohne Fehler

## 14. Prüfung

- [ ] 14.1 `uv run pytest`; in `frontend-food`: `npm run test`, `npx tsc -b --noEmit`, `npm run lint`
- [ ] 14.2 Lokal `migrate` und `check_meal_integrity`; Browser (Desktop und 375 px): Plan 14 ohne „1. Januar“, Plan-Check zeigt Wraps-Hinweis und fehlende Menge, Cockpit „Ziel: 2.335 kcal“, Einkauf mit deutschem Komma, Packungen und Litern, Rezeptliste „Rezepte“; Screenshot-Vergleich der Kernseiten vor/nach der Token-Migration; keine Wörter statt Icons beim Laden
- [ ] 14.3 Prod-Schritte ins gesammelte Runbook aufnehmen (`check_meal_integrity` als Trockenlauf vor dem Deploy; Packungsvorschläge auf Prod erst nach Deploy mit Kostenanzeige und Freigabe)
