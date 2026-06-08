## Context

Essenspläne mit Zeitrahmen (`start_datetime`, `end_datetime`) haben an den Randtagen nur teilweise Mahlzeiten: Der Backend-Code in `planner/models/meal_plan.py:create_meals_for_date_timeaware()` überspringt Mahlzeit-Typen, deren Default-Zeit außerhalb des Plan-Zeitfensters liegt. Zusätzlich können Benutzer manuell Mahlzeiten hinzufügen/löschen, sodass jeder Tag eine andere Abdeckung haben kann.

Aktuell werden in allen Views (TableView, DayPlanView, NutritionView, CostDashboard, Suggestions) die Tages-Sollwerte entweder als volle DGE-Referenz (2335 kcal, etc.) verglichen oder implizit über die Summe der `day_part_factors` summiert. Beides ignoriert die tatsächliche Tagesabdeckung – entweder durch zu optimistische oder nicht nachvollziehbare Vergleiche.

Die Coverage wird ausschließlich frontend-seitig aus den `day_part_factor`-Werten der existierenden Mahlzeiten berechnet. Backend-Änderungen sind nicht erforderlich (Hybrid-Ansatz).

## Goals / Non-Goals

**Goals:**
- Tagesabdeckung = `sum(day_part_factor)` aller Mahlzeiten (exkl. Drinks), gecappt bei 1.0
- Coverage-Floor von 35% für alle KPI-Vergleiche (`effectiveCoverage = Math.max(coverage, 0.35)`)
- Coverage-Badges (grün ≥ 80%, gelb 35–79%, rot < 35%) an 4 Positionen
- Graue, nicht-interaktive Zellen in der Tabelle für Mahlzeit-Typen, die auf ersten/letzten Tagen natürlicherweise fehlen
- Skalierung von Nährwert-, Kosten- und Regel-Targets mit `effectiveCoverage`
- Ein gemeinsamer Coverage-Helper in `schemas/mealPlan.ts`

**Non-Goals:**
- Keine Backend-Änderungen (kein neues API-Feld, keine Migration)
- Keine Änderung der tatsächlichen Essensplan-Logik (Meal-Erstellung, day_part_factor-Propagation)
- Kein Ändern des Suggestion-Service-Backend-Codes (Coverage-Skalierung läuft frontend-seitig)
- Keine Änderung an DayPlanView-Berechnungen (diese sind bereits coverage-korrekt via `sum(day_part_factor * NORM)`)

## Decisions

### Decision 1: Coverage = Summe der day_part_factors (nicht Meal-Anzahl)

**Wahl:** Coverage = `sum(day_part_factor)` aller Mahlzeiten des Tages, exkl. drinks (factor = 0.00).

**Begründung:** `day_part_factor` bildet bereits die gewünschte Nährwertverteilung ab (Frühstück 0.25, Mittag 0.35, etc.). Ein Tag mit nur Mittag (0.35) hat 35% Coverage – das ist präziser als eine reine Meal-Zählung (1 von 5 = 20%). Alternative "erwartbare Meal-Typen" wäre präziser für Randtage, aber komplexer und weniger konsistent, wenn Benutzer manuell Mahlzeiten hinzufügen/löschen.

### Decision 2: Coverage-Floor bei 35%

**Wahl:** `effectiveCoverage = Math.max(coverage, 0.35)`

**Begründung:** Bei sehr niedriger Coverage (< 35%) führt die Skalierung zu absurd niedrigen Targets (z.B. 2335 * 0.10 = 233 kcal für einen Snack). Der Floor verhindert sinnlose Vergleiche. 35% entspricht dem `day_part_factor` eines einzelnen Mittag- oder Abendessens – der minimal sinnvollen Einheit.

### Decision 3: Graue Zellen basierend auf Plan-Start/End-Zeit

**Wahl:** Zellen für Mahlzeit-Typen, deren Default-Zeit außerhalb des Plan-Zeitfensters liegt, werden grau hinterlegt und sind nicht interaktiv.

**Begründung:** Die gleiche Logik wie im Backend (`create_meals_for_date_timeaware`) wird im Frontend dupliziert (`MEAL_TYPE_DEFAULT_TIMES` existiert bereits in `MealEventDetailPage.tsx`). Alternative: immer grau machen, wenn keine Mahlzeit existiert – das würde aber "Benutzer hat noch nichts eingetragen" von "kann logischerweise nicht existieren" nicht unterscheiden.

### Decision 4: Frontend-seitige Berechnung

**Wahl:** Coverage-Berechnung ausschließlich im Frontend, keine Backend-API-Änderung.

**Begründung:** Alle benötigten Daten (`day_part_factor` auf jedem Meal) sind bereits im `MealPlanDetail` API-Response enthalten. Die Berechnung ist simpel. Backend-Erweiterung (`day_coverage`-Feld) bleibt als zukünftige Optimierung möglich (Hybrid-Ansatz).

### Decision 5: Coverage-Badge als eigener UI-Helper

**Wahl:** Eine neue Funktion `getCoverageBadge(coverage)` in `schemas/mealPlan.ts` gibt `{ label: string, status: 'green'|'yellow'|'red', coverage: number }` zurück.

**Begründung:** Einheitliche Darstellung an allen 4 Positionen. Vermeidet Duplikation der Badge-Farb-Logik. Food Frontend AGENTS.md verlangt Lucide-Icons für UI, aber Badges sind Text-basiert (keine Icons nötig).

### Decision 6: NutritionView-Skalierung nur für SollIstBar, nicht für Rohdaten

**Wahl:** Die DGE-Referenzwerte (min_green/max_green) werden mit `effectiveCoverage` multipliziert, die tatsächlichen Nährwerte bleiben unverändert.

**Begründung:** Der Ist-Wert ist real und sollte nicht verzerrt werden. Nur der Soll-Vergleich (die Referenz) muss skalieren. Bei `selectedDate = null` (Gesamter Plan) wird der durchschnittliche Coverage-Wert über alle Tage verwendet.

## Risks / Trade-offs

| Risiko | Mitigation |
|---|---|
| **Logik-Duplikation**: `MEAL_TYPE_DEFAULT_TIMES` existiert in Backend UND Frontend | Als Konstante in `schemas/mealPlan.ts` zentralisieren; bei Backend-Änderungen manuell syncen. Frontend-Konstante bereits in `MealEventDetailPage.tsx` vorhanden. |
| **Verwirrung durch skalierte Targets**: Benutzer verstehen nicht, warum Soll-Werte niedriger sind | Coverage-Badge mit Label "40% Tagesabdeckung" und farblichem Hinweis erklärt den Kontext direkt neben dem skalierten Wert. |
| **Floor versteckt niedrige Coverage**: bei 25% Coverage zeigt Badge rot an, Vergleich läuft gegen 35% | Die rote Badge-Farbe signalisiert "lückenhaft", auch wenn der KPI-Vergleich selbst auf 35% skaliert wurde. |
| **Unterschiedliche Coverage an verschiedenen Tagen**: Durchschnitt für den Gesamtplan kann irreführend sein | Bei Gesamtplan-Ansicht zusätzlich "Ø Coverage: XX%" im NutritionView-Header anzeigen. |
