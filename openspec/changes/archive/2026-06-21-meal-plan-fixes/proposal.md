## Why

Die Skalierungs- und Berechnungslogik der Essensplan-Detailseite (`/meal-plans/:id`)
enthält mehrere Widersprüche und Bugs, die zu falschen Soll/Ist-Werten und einer intern
inkonsistenten Anzeige führen. Der gravierendste Fehler: `override_portions` (abweichende
Personenzahl pro Mahlzeit) wird in Energie-/Kostenberechnung und `scale-to-target` ignoriert,
während Einkaufsliste und externe Kosten es berücksichtigen — das Tool widerspricht sich
selbst und skaliert Mahlzeiten um den Faktor `override_portions / norm_portions` falsch.
Zusätzlich soll die Tagesplan-Übersicht (wie die Tabellenansicht) eine editierbare Uhrzeit
pro Mahlzeit erhalten.

## What Changes

- **BREAKING** Einheitliches Konzept `effective_portions = override_portions or norm_portions`:
  Alle Mahlzeit-bezogenen Backend-Berechnungen (Energie, Kosten, Nutrition Summary, Cost
  Summary, scale-to-target) nutzen künftig `effective_portions` statt hartcodiertem
  `norm_portions`. Behebt die fehlerhafte Skalierung und die interne Inkonsistenz.
- **BREAKING** `MealOut.total_energy_kcal` ist künftig **immer** ein Gesamtwert (× effective_portions).
  Der external-Branch gibt `external_energy_kcal × effective_portions` zurück (vorher pro Person),
  symmetrisch zu `total_cost_eur`.
- Pro-Person-Aggregation auf Tages-/Planebene: je Mahlzeit `total / effective_portions`,
  dann diese Pro-Person-Werte summieren (statt Gesamtsumme / globalem norm_portions).
- **Uhrzeit pro Mahlzeit**: Anzeige als eigene Zeile unter dem Namen im Tagesplan (`MealSlot`),
  fix in Zeitzone `Europe/Berlin` formatiert. Start-/Endzeit editierbar (Datum bleibt fix) über
  einen neuen Menüpunkt "Zeit bearbeiten…" im `MealActionsMenu`. Validierung `end > start`
  erzwingen, Überlappung mit anderen Mahlzeiten nur warnen (Speichern erlaubt).
- `handleAddMealType` nutzt künftig `plan.meal_default_times` (Fallback auf hardcoded Defaults).
- DGE-Energie-Rule (`seed_rules.py`) wird um die Norm-Person (2335 kcal, PAL 1.75) als Single
  Source zentriert.
- `MealSlot` Ist-Anzeige: "Soll X%" (Tagesanteil, neutral) und "Ist X% erfüllt"
  (Soll-Abdeckung, gefärbt) getrennt darstellen; doppelt berechnetes `actualDailyPercent`
  entfernen.
- Tagesanteil-Überdeckung (>100%) sichtbar machen ("Überplant 110%" statt stillem Cap bei 1.0).
- Kleinere Fixes: toten `avgCoverage`-Fallback aufräumen, Reserve-Header-Label präzisieren,
  Allergen-Tab-State auf `plan` zurücksetzen wenn keine Tags mehr vorhanden.

## Capabilities

### New Capabilities
- `meal-plan-time-editing`: Anzeige und Bearbeitung der Start-/Endzeit pro Mahlzeit in der
  Tagesplan-Übersicht und Tabellenansicht (read + edit, Validierung, Überlappungs-Warnung,
  fixe Zeitzone Europe/Berlin).
- `meal-plan-effective-portions`: Einheitliches `effective_portions`-Konzept für alle
  Mahlzeit-bezogenen Berechnungen und konsistente Pro-Person-Aggregation.

### Modified Capabilities
- `meal-energy-display`: `total_energy_kcal` ist künftig immer Gesamtwert; external-Branch
  × effective_portions; Pro-Person-Aggregation je Mahlzeit.
- `meal-scale-to-target`: misst gegen denselben Portionsbegriff (effective_portions) wie die
  Energieberechnung; behebt den ×(override/norm)-Skalierungsfehler.
- `meal-plan-soll-ist-band`: Norm-Person (2335) als Single Source, DGE-Rule-Band entsprechend
  zentriert; Tagesanteil-Überdeckung (>100%) wird sichtbar.

## Impact

**Backend (Django, planner App)**
- `planner/models/meal_plan.py`: neue `Meal.effective_portions`-Property (oder Helper).
- `planner/schemas/meal_plan.py`: `MealItemOut.resolve_energy_kcal/cost_eur`,
  `MealOut.resolve_total_energy_kcal/cost_eur` auf `effective_portions`; external-kcal-Branches
  × effective_portions; `MealUpdateIn` um `start_datetime`/`end_datetime` erweitern.
- `planner/api/meal_plan.py`: `scale_meal_to_target` (Portionsbegriff angleichen),
  `nutrition_summary` (Umbau auf Per-Meal-Aggregation), `cost_summary` (cost_per_person je Meal),
  `update_meal` (Zeitfelder + `end > start`-Validierung).
- `recipe/management/commands/seed_rules.py`: energy_kcal-Rule-Band um 2335 zentrieren.
- Migrationen: keine Schema-Änderung am Modell nötig (Felder existieren bereits).

**Frontend (frontend-food)**
- `schemas/mealPlan.ts`: `MealUpdateInSchema` um `start_datetime`/`end_datetime`; neuer
  `formatMealTime`-Helper (TZ Europe/Berlin); neue `effectivePortions(meal)`-Hilfe;
  `getDayCoverage`/`getCoverageBadge` um Überdeckungs-Zustand.
- `pages/planning/MealSlot.tsx`: Zeit-Zeile, Soll/Ist-Trennung, `/effectivePortions`.
- `pages/planning/TableView.tsx`: `/effectivePortions`, Zeit-Bearbeitung via Menü.
- `pages/planning/DayPlanView.tsx`: Per-Meal-Pro-Person-Summen.
- `pages/planning/NutritionView.tsx`: `avgCoverage`-Cleanup.
- `pages/planning/MealEventDetailPage.tsx`: `handleAddMealType` nutzt `meal_default_times`,
  Reserve-Label, Tab-State-Guard, `handleUpdateMeal` um Zeitfelder.
- `components/planning/MealActionsMenu.tsx`: Menüpunkt "Zeit bearbeiten…" + Editor.

**Tests (Pflicht)**
- scale-to-target mit `override_portions`; external total_energy_kcal (× portions);
  update_meal Zeit-Validierung (`end <= start` → 400); nutrition/cost Aggregation.
