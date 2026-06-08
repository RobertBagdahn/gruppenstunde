## Why

Essenspläne mit Zeitrahmen (Start/Ende Uhrzeit) haben an den Randtagen nur einen Teil der Mahlzeiten – z.B. kein Frühstück bei Start um 14:00. Die Nährwert-, Kosten- und Regel-Vergleiche ignorieren diese unvollständige Tagesabdeckung aktuell und vergleichen gegen volle Tagesreferenzen, was zu irreführenden roten Ampeln führt. Zudem fehlt eine visuelle Unterscheidung von "Mahlzeit existiert nicht" vs. "Mahlzeit ist leer" in der Tabelle.

## What Changes

- **Day-Coverage-Berechnung**: Jeder Tag bekommt einen Coverage-Wert = Summe der `day_part_factor` aller existierenden Mahlzeiten (exkl. Drinks), gecappt bei 1.0. Floor = 35% für KPI-Vergleiche.
- **Coverage-Badges**: Farblich codierte Badges (grün/gelb/rot) in TableView Footer, DayPlanView Tag-Header, NutritionView Date-Buttons und SollIstBar.
- **Graue Zellen in der Tabelle**: Auf ersten und letzten Tagen werden Zellen für Mahlzeit-Typen, die aufgrund der Start/End-Uhrzeit natürlicherweise fehlen, grau hinterlegt und nicht interaktiv.
- **KPI-Skalierung**: NutritionView, CostDashboard und Cockpit/Vorschläge skalieren ihre Soll-Vergleiche mit `max(coverage, 0.35)`.
- **BREAKING**: HealthRules im Cockpit werden für Tage mit < 100% Coverage mit dem Coverage-Faktor skaliert.

## Capabilities

### New Capabilities
- `day-coverage`: Berechnung und Darstellung der Tagesabdeckung aus `day_part_factor`. Coverage-Badges in TableView, DayPlanView, NutritionView. KPI-Skalierung für Nährwerte, Kosten und HealthRules in NutritionView, CostDashboard und Cockpit.

### Modified Capabilities
- `meal-plan-table-view`: Visuelle Markierung (grau) von nicht-existierenden Mahlzeit-Zellen auf ersten/letzten Tagen. Coverage-Badge im Tagesbilanz-Footer.
- `meal-cockpit`: HealthRule-Targets werden mit `max(coverage, 0.35)` für day-level Regeln skaliert.

## Impact

- **Frontend-Komponenten**: `TableView.tsx` (graue Zellen + Coverage-Badge), `DayPlanView.tsx` (Coverage-Badge im Header), `NutritionView.tsx` (skalierte Targets + Coverage-Badge), `CostDashboard.tsx` (skalierte Budgets), `MealSlot.tsx` (einheitliche Coverage-Darstellung)
- **Schemas/Funktionen**: Neue gemeinsame Coverage-Helper in `schemas/mealPlan.ts` (`getDayCoverage()`, `getEffectiveCoverage()`, `getCoverageBadge()`)
- **Keine Backend-Änderungen notwendig** (Coverage wird frontend-seitig aus `day_part_factor` berechnet; Hybrid-Architektur erlaubt späteres Backend-Feld)
- **Keine Migrationen**
