## ADDED Requirements

### Requirement: Kosten pro Rezept im Kochplan

Das System SHALL pro CookingScheduleItem die Kosten `total_cost_eur` (float) zurückgeben. Die Berechnung SHALL identisch zur existierenden Cost-Summary-Logik erfolgen: `compute_variant_cost(item) * item.factor * (effective_portions / servings)`.

#### Scenario: Kosten für ein Rezept

- **WHEN** ein Rezept cached_price_total = 15.00 € für 4 Portionen hat und für 20 Personen eingeplant ist
- **THEN** beträgt `total_cost_eur` = 15.00 * (20/4) = 75.00 €

### Requirement: Kosten pro Tag

Das System SHALL pro CookingScheduleDay die Summe `total_cost_eur` aller Rezepte dieses Tages zurückgeben.

#### Scenario: Tageskosten

- **WHEN** an einem Tag drei Rezepte mit Kosten 20€, 30€ und 50€ liegen
- **THEN** beträgt `total_cost_eur` = 100.00 €

### Requirement: Gesamtkosten im Kochplan

Das System SHALL im CookingScheduleOut `total_cost_eur` (Summe aller Tage) und `total_cost_with_reserve` (inkl. Reservefaktor) zurückgeben.

#### Scenario: Gesamtkosten mit Reserve

- **WHEN** die Gesamtkosten 400€ betragen und der Reservefaktor 1.1 ist
- **THEN** beträgt `total_cost_eur` = 400€ und `total_cost_with_reserve` = 440€

### Requirement: Kosten-Anzeige im Frontend

Das Frontend SHALL in der Druckansicht Kosten pro Rezept, pro Tag und Gesamtkosten anzeigen. Format: "12,50 €" mit zwei Dezimalstellen.

#### Scenario: Kosten in der Druckansicht

- **WHEN** ein Rezept Kosten von 42.30€ hat
- **THEN** zeigt die Rezeptkarte "42,30 €" unterhalb der Zutaten

#### Scenario: Tagessumme

- **WHEN** ein Tag mehrere Rezepte mit Gesamtkosten 123.50€ hat
- **THEN** zeigt der Tagessummen-Bereich "Kosten heute: 123,50 €"
