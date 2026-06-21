## Context

Die Essensplan-Detailseite (`/meal-plans/:id`) berechnet Soll/Ist-Werte für Energie und
Kosten an mehreren Stellen — teils im Backend (Pydantic-Resolver, Nutrition-/Cost-Summary-
Endpunkte), teils im Frontend (MealSlot, TableView, DayPlanView, NutritionView). Diese Pfade
sind historisch gewachsen und nutzen uneinheitliche Annahmen über die Portionszahl.

Kernproblem: `Meal.override_portions` (abweichende Personenzahl pro Mahlzeit, z.B. Tagesgäste)
wird inkonsistent verwendet:

- **Berücksichtigt**: Einkaufsliste (`shopping_service.py:90`), externe Kosten
  (`schemas/meal_plan.py:152`), scale-to-target (`api/meal_plan.py:602`).
- **Ignoriert**: `total_energy_kcal`, `total_cost_eur`, MealItem-Energie/Kosten,
  Nutrition Summary, Cost Summary cost_per_person — diese nutzen hartcodiert `norm_portions`.

Folge: Bei `override_portions=20` und `norm_portions=10` kauft die Einkaufsliste für 20 ein,
die kcal-Bilanz rechnet aber mit 10, und scale-to-target skaliert um den Faktor 2 daneben
(misst gegen norm, teilt durch override). Zusätzlich hat `total_energy_kcal` zwei Einheiten:
GESAMT für normale Meals, PRO PERSON für externe (`schemas/meal_plan.py:138`, belegt durch
Test `test_external_meal_serialization` → 500 statt 5000).

Sekundär: zwei widersprüchliche Tagesbedarfswerte (Norm-Person 2335 vs. DGE-Rule-Band-Mitte
2270), doppelt berechnete/verwechselte Ist-Prozente in MealSlot, und fehlende Uhrzeit-Anzeige
in der Tagesplan-Übersicht (in TableView bereits vorhanden).

## Goals / Non-Goals

**Goals:**
- Ein einziges, konsistentes Portionskonzept `effective_portions = override_portions or norm_portions`
  für ALLE Mahlzeit-bezogenen Berechnungen.
- `total_energy_kcal`/`total_cost_eur` haben eine einheitliche Einheit (immer GESAMT).
- scale-to-target liefert korrekte Faktoren unabhängig von override_portions.
- Mathematisch saubere Pro-Person-Aggregation bei gemischten Portionszahlen.
- Editierbare, korrekt formatierte Uhrzeit pro Mahlzeit in beiden Ansichten.
- Ein einziger Tagesbedarfs-Bezug (Norm-Person 2335).

**Non-Goals:**
- `drinks` als eigener Mahlzeitentyp (separater künftiger Thread; Frontend-Vorbereitungscode
  bleibt unangetastet).
- Konfigurierbarer Tagesbedarf nach Altersgruppe/Aktivität (eigener Thread).
- Verschieben von Mahlzeiten auf andere Tage (nur Uhrzeit editierbar, Datum bleibt fix).
- `reserve_factor`-Logik (ist bereits korrekt; nur UI-Label wird präzisiert).

## Decisions

### D1: `effective_portions` als zentrale Property auf dem Meal-Modell
`Meal.effective_portions` → `self.override_portions or self.meal_plan.norm_portions or 1`.
Alle Resolver und Aggregations-Endpunkte greifen darauf zu.
*Alternative (verworfen)*: override_portions abschaffen — verliert den legitimen
Tagesgäste-Use-Case. *Alternative (verworfen)*: nur scale-to-target fixen — beseitigt die
×2-Skalierung, lässt aber die Einkauf-vs-Bilanz-Diskrepanz bestehen.

### D2: `total_energy_kcal` immer GESAMT
External-Branch: `external_energy_kcal × effective_portions`; Fallback-Branch:
`2335 × day_part_factor × effective_portions`. Damit symmetrisch zu `total_cost_eur` und
kompatibel mit Frontend `/effective_portions`.
*Konsequenz*: Test `test_external_meal_serialization` (erwartet 500) muss auf 5000 angepasst werden.

### D3: Pro-Person-Aggregation "je Mahlzeit, dann summieren"
Pro-Person je Mahlzeit = `total / effective_portions`; Tages-/Plansummen summieren diese
Pro-Person-Werte. Sauber bei gemischten Portionszahlen (jeder Esser bekommt "seine" kcal-Summe).
Wichtige Vereinfachung: Pro-Person ist portions-invariant (`total/eff = recipe×factor/servings`),
nur Gesamt-/Einkaufswerte ändern sich tatsächlich.
*Konsequenz*: `nutrition_summary` (api:735+) iteriert aktuell flach über alle items mit globalem
norm_portions → muss auf Per-Meal-Aggregation umgebaut werden (größter Einzeleingriff).

### D4: Uhrzeit fix in Europe/Berlin formatieren
`formatMealTime(datetime)` mit `toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', ... })`,
zentral in `schemas/mealPlan.ts`. Lagerzeit ist ortsfest und darf nicht vom Browser-Standort
des Betrachters abhängen. Ersetzt das duplizierte `formatTime` in TableView.
*Hinweis*: USE_TZ=True, Server-TZ Europe/Berlin; Schreiben erfolgt naiv (`${date}T${time}:00`)
wie bisher in handleAddMealType.

### D5: Zeit editierbar, nur Uhrzeit, via Menü, end>start + Überlappungs-Warnung
`MealUpdateIn` erhält `start_datetime`/`end_datetime`. Editor im `MealActionsMenu`
("Zeit bearbeiten…"). Beim Speichern wird aus den HH:MM-Inputs mit dem bestehenden Datum der
Mahlzeit ein naiver ISO-String gebaut. Backend erzwingt `end > start` (400 sonst);
Überlappung mit anderen Mahlzeiten desselben Tages wird im Frontend nur als Warnung angezeigt,
Speichern bleibt erlaubt (parallele Snacks legitim).

### D6: Norm-Person (2335) als Single Source
DGE-Energie-Rule (`seed_rules.py`, scope day + meal_event) wird so angepasst, dass das grüne
Band um 2335 zentriert ist. Die `NORM_PERSON_DAILY_KCAL`-Konstante bleibt 2335.

### D7: Ist-Prozent in MealSlot trennen
"Soll X%" = Tagesanteil (day_part_factor), neutral. "Ist X% erfüllt" = `coverage.percent`
(ist_kcal / mahlzeit_soll), gefärbt via coverage.status. `actualDailyPercent` (doppelte,
rundungsdriftende Berechnung) entfällt.

### D8: Überdeckung sichtbar machen
`getDayCoverage` Cap bei 1.0 wird so erweitert, dass >100% als eigener Zustand "Überplant"
(Warnfarbe) erscheint. `getCoverageBadge.status` wird um diesen Fall ergänzt; alle Konsumenten
(DayPlanView, TableView, NutritionView) angepasst.

## Risks / Trade-offs

- [effective_portions in beiden Schichten] Wenn Backend auf effective_portions umstellt, aber
  Frontend an einer Stelle weiter `/normPortions` teilt, kehrt sich der Fehler nur um.
  → Mitigation: alle `/normPortions`-Stellen (gemappt: MealSlot:148/151/326/329,
  TableView:404/405, DayPlanView:112/114) gemeinsam auf `effectivePortions(meal)` umstellen,
  Tests für gemischte Portionszahlen.
- [nutrition_summary Umbau] Per-Meal-Aggregation ist strukturell anders als die aktuelle flache
  Iteration. → Mitigation: dedizierte Tests für Mehrtages-/Mehrmahlzeiten-Pläne mit override.
- [Test-Anpassung total_energy_kcal] Bestehende Tests erwarten die alte (pro-Person-)external-
  Einheit. → Mitigation: Tests bewusst mit aktualisierten Erwartungen (×portions) anpassen,
  laut AGENTS.md keine Rückwärtskompatibilität nötig.
- [Überdeckungs-Zustand bricht getEffectiveCoverage-Annahme] effCoverage skaliert Rule-Bänder;
  bei >100% würde es Bänder hochskalieren. → Mitigation: bewusst entscheiden, ob effCoverage
  bei Überdeckung auf 1.0 gedeckelt bleibt (Rules) während die Badge die echte Überdeckung zeigt.

## Migration Plan

1. Backend: `effective_portions`-Property + alle Resolver/Endpunkte umstellen, Rule-Reseed.
2. Backend-Tests anpassen/ergänzen (scale-to-target, external, nutrition, cost, update_meal-Zeit).
3. Frontend Zod-Schema + Helper (`formatMealTime`, `effectivePortions`, Coverage-Überdeckung).
4. Frontend-Views auf effective_portions + Pro-Person-Aggregation + Zeitanzeige/-editor.
5. `seed_rules` neu ausführen (`uv run python manage.py seed_rules`) in betroffenen Umgebungen.
Kein DB-Schema-Migration nötig (Felder existieren). Rollback = Revert; keine Datenmigration.

## Open Questions

- Bandbreite der angepassten DGE-Energie-Rule: bestehende Breite (717 kcal) um 2335 verschieben
  oder neu wählen?
- Soll `getEffectiveCoverage` bei Überdeckung (>1.0) für Rule-Skalierung auf 1.0 gedeckelt
  bleiben, während die Tages-Badge die echte Überdeckung anzeigt?
