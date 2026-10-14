## 0. Freigabe

- [x] 0.1 Vorschlagswerte und offene Fragen aus `design.md` (Reserve 1,0–2,0, PAL 1,0–2,5, Tagesanteile je 0–1 und Summe ≤ 1,5, Normportionen 0–1000 inkl. Duplizieren, Override 1–1000, Mengen > 0 und ≤ 100 000 g, Portionsgewicht, Planlänge ≤ 60 Tage, ≤ 500 Mahlzeiten, Umgang mit Bestandsdaten) vom Owner bestätigen lassen

## 1. Backend

- [x] 1.1 `planner/services/input_bounds.py`: Konstanten und Prüffunktionen mit deutschen Meldungen und `fields`
- [x] 1.2 Pydantic: `MealPlanCreateIn`, `MealPlanUpdateIn`, `MealPlanDuplicateIn` (Reserve, PAL, Tagesanteile inkl. Summe, Normportionen, Zeitraum)
- [x] 1.3 Pydantic: `MealCreateIn`, `MealUpdateIn` (`override_portions`, `day_part_factor`)
- [x] 1.4 Mengen: `MealItemCreateIn`, `MealItemUpdateIn`, `RefMealItemIn`, Wizard-Endpunkte; Grammobergrenze nach `resolve_grams` im Service prüfen (auch beim Einheitenwechsel und Kopieren)
- [x] 1.5 Portionsgewicht `weight_g` beim Anlegen/Ändern von Portionen begrenzen
- [x] 1.6 Planlänge vor dem Erzeugen der Mahlzeiten prüfen; Mahlzeitenzahl beim Hinzufügen prüfen
- [x] 1.7 Berechnungen begrenzen Bestandswerte zur Laufzeit; lesender Command `report_meal_plan_bounds`

## 2. Schema-Sync

- [x] 2.1 `frontend-food/src/lib/mealPlanBounds.ts` und Zod `schemas/mealPlan.ts` mit denselben Grenzen; Backend-Test vergleicht die Konstanten

## 3. Food-Frontend

- [x] 3.1 `SettingsPanel.tsx`, `CreateMealPlanDialog.tsx`, `wizard/ExtendedSettingsSection.tsx`, `wizard/MealPlanWizardPage.tsx`: Feldgrenzen, Bereichshinweis, kein Request bei ungültigen Werten
- [x] 3.2 Meal-Aktionen „Portionen ändern“ und „Soll ändern“ sowie Mengen-Dialoge mit denselben Grenzen (Mengen im Plan-Editor: Server-422 wird als Fehlermeldung gezeigt)
- [x] 3.3 422-`fields` den Feldern zuordnen; Hinweis bei Bestandswerten außerhalb der Grenzen

## 4. Tests

- [x] 4.1 Backend: Grenzwerte je Feld (knapp innerhalb/außerhalb) für POST, PATCH und Duplizieren; 401 ohne Anmeldung; PATCH anderer Felder bei Altwerten; Bulk-Wizard atomar; kein 500 bei großen Mengen; Planlänge und Mahlzeitenlimit
- [x] 4.2 Backend: Laufzeitbegrenzung in Skalierung und Einkaufsliste; Command ändert keine Daten
- [x] 4.3 Frontend: Zod-Grenzen, Feldfehler, Serverfehler-Zuordnung (320-px-Ansicht nicht im Browser geprüft)
- [x] 4.4 `uv run pytest planner supply`, `uv run ruff check`, Food-Typecheck, Lint, Tests
