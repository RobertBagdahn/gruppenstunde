# day-coverage Specification

## Purpose

Berechnung und Darstellung der Tagesabdeckung (Day Coverage) für Essenspläne. Coverage = Summe der `day_part_factor` aller Mahlzeiten eines Tages (exkl. Drinks). Diese Kennzahl steuert visuelle Badges und skaliert KPI-Vergleiche in NutritionView, CostDashboard und Suggestions.

## ADDED Requirements

### Requirement: Coverage-Berechnung

Das System SHALL für jeden Tag eines Essensplans eine Tagesabdeckung (coverage) berechnen: `sum(day_part_factor)` aller Mahlzeiten des Tages mit `meal_type !== 'drinks'`, gecappt bei maximal 1.0. Für KPI-Vergleiche SHALL ein Floor von 0.35 gelten: `effectiveCoverage = Math.max(coverage, 0.35)`.

#### Scenario: Standard-Tag mit allen Mahlzeiten

- **WHEN** ein Tag Frühstück (0.25), Mittag (0.35), Abendessen (0.30) und Snack (0.10) enthält
- **THEN** beträgt die Coverage `0.25 + 0.35 + 0.30 + 0.10 = 1.0`

#### Scenario: Partial-Tag (erster Tag, Start um 14:00)

- **WHEN** ein Tag nur Abendessen (0.30) und Snack (0.10) enthält (kein Frühstück, Mittag)
- **THEN** beträgt die Coverage `0.30 + 0.10 = 0.40` (40 %)
- **THEN** beträgt die effectiveCoverage `Math.max(0.40, 0.35) = 0.40`

#### Scenario: Sehr geringe Coverage mit Floor

- **WHEN** ein Tag nur einen Snack (0.10) enthält
- **THEN** beträgt die Coverage `0.10` (10 %)
- **THEN** beträgt die effectiveCoverage `Math.max(0.10, 0.35) = 0.35`

#### Scenario: Drinks werden ignoriert

- **WHEN** ein Tag nur Getränke (0.00) enthält
- **THEN** beträgt die Coverage `0.00`

### Requirement: Coverage-Badge

Das System SHALL einen Coverage-Badge bereitstellen, der die Coverage als farblich codiertes Label darstellt. Die Farbe richtet sich nach der effektiven Coverage (vor Floor-Anwendung):

- **Grün (≥ 80%)**: "Vollständig"
- **Gelb (35–79%)**: "Teilweise X %"
- **Rot (< 35%)**: "Lückenhaft X %"

Der Badge SHALL als kompaktes UI-Element (Text + farbiger Hintergrund) dargestellt werden.

#### Scenario: Volle Abdeckung

- **WHEN** die Coverage eines Tages ≥ 0.80 beträgt
- **THEN** zeigt der Badge grünen Hintergrund und Text "Vollständig"

#### Scenario: Teilweise Abdeckung

- **WHEN** die Coverage 0.55 beträgt
- **THEN** zeigt der Badge gelben Hintergrund und Text "Teilweise 55 %"

#### Scenario: Lückenhafte Abdeckung

- **WHEN** die Coverage 0.25 beträgt
- **THEN** zeigt der Badge roten Hintergrund und Text "Lückenhaft 25 %"

### Requirement: Coverage-Integration in NutritionView

Die NutritionView SHALL bei Tag-Auswahl die DGE-Referenzwerte mit `effectiveCoverage` multiplizieren. Bei Gesamtplan-Ansicht SHALL der durchschnittliche Coverage-Wert aller Tage verwendet werden. Die tatsächlichen Nährwerte (Ist) bleiben unverändert.

#### Scenario: Tag mit 40% Coverage ausgewählt

- **WHEN** ein Benutzer in der NutritionView einen Tag mit 40% Coverage auswählt
- **THEN** werden die DGE-Referenzwerte (z.B. protein 45–80g) mit 0.40 multipliziert (18–32g)
- **THEN** zeigt der SollIstBar einen Hinweis "Skaliert auf 40 % Tagesabdeckung"
- **THEN** der Datums-Button zeigt den Coverage-Badge (gelb, "Teilweise 40 %")

#### Scenario: Gesamtplan-Ansicht mit unterschiedlicher Coverage

- **WHEN** ein Plan 3 Tage mit Coverages 0.40, 1.0 und 0.25 hat
- **THEN** beträgt die durchschnittliche Coverage `(0.40 + 1.0 + 0.25) / 3 ≈ 0.55`
- **THEN** werden die DGE-Referenzwerte mit 0.55 multipliziert

### Requirement: Coverage-Integration in CostDashboard

Das CostDashboard SHALL das `budget_per_person_per_day` mit `effectiveCoverage` multiplizieren, wenn ein Tag ausgewählt ist. Bei Gesamtansicht SHALL der durchschnittliche Coverage-Wert verwendet werden.

#### Scenario: Tag mit 60% Coverage und 8€ Budget

- **WHEN** ein Benutzer im CostDashboard einen Tag mit 60% Coverage und 8€ Budget betrachtet
- **THEN** beträgt das skalierte Budget `8.00 × 0.60 = 4.80 €`

### Requirement: Coverage-Integration in Suggestions (Cockpit)

Die day-level HealthRules im Suggestion-Dashboard SHALL mit `effectiveCoverage` skaliert werden. Meal-level und meal_event-level Regeln bleiben unverändert.

#### Scenario: Day-Level Regel mit Coverage

- **WHEN** eine day-level Regel "protein_g >= 45g" für einen Tag mit 50% Coverage ausgewertet wird
- **THEN** beträgt der skalierte Schwellwert `45 × 0.50 = 22.5g`
- **THEN** die Regel wird gegen 22.5g statt 45g ausgewertet

### Requirement: Coverage-Badge im DayPlanView

Der DayPlanView SHALL im Tag-Header einen Coverage-Badge neben der Datumsanzeige darstellen.

#### Scenario: Coverage-Badge im Tag-Header

- **WHEN** ein Benutzer den DayPlanView öffnet
- **THEN** zeigt jeder Tag-Header den Coverage-Badge mit Farbe und Prozentwert
