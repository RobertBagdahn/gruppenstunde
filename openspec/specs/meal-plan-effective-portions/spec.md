# meal-plan-effective-portions Specification

## Purpose
Define a single, consistent "effective portions" concept per meal so that all meal-related energy and cost calculations honor `override_portions` when set, instead of hardcoding the plan's `norm_portions`.

## Requirements
### Requirement: Effektive Portionszahl pro Mahlzeit

Das System SHALL eine einheitliche effektive Portionszahl pro Mahlzeit definieren:
`effective_portions = override_portions or norm_portions`. Alle mahlzeit-bezogenen
Energie- und Kostenberechnungen (MealItem-Energie/Kosten, MealOut Gesamtenergie/-kosten,
scale-to-target, Nutrition Summary, Cost Summary) MUST diese effektive Portionszahl
verwenden und DÜRFEN NICHT hartcodiert `norm_portions` benutzen, wenn eine Mahlzeit
`override_portions` gesetzt hat.

#### Scenario: Energie nutzt override_portions
- **WHEN** ein Plan `norm_portions = 10` hat und eine Mahlzeit `override_portions = 20`
  mit einem Rezept (servings=4, cached_energy_total_kcal=2000, factor=1.0)
- **THEN** `MealOut.total_energy_kcal` SHALL `2000 × 1.0 × (20/4) = 10000` kcal betragen
  (nicht 5000)

#### Scenario: Ohne override fällt auf norm_portions zurück
- **WHEN** eine Mahlzeit kein `override_portions` gesetzt hat (None)
- **THEN** `effective_portions` SHALL gleich `norm_portions` des Plans sein

### Requirement: Konsistente Pro-Person-Aggregation

Pro-Person-Werte auf Tages- und Planebene SHALL je Mahlzeit als
`total / effective_portions` berechnet und anschließend summiert werden. Das System
MUST NICHT die Gesamtsumme durch ein globales `norm_portions` teilen, wenn Mahlzeiten
unterschiedliche effektive Portionszahlen haben.

#### Scenario: Tagessumme mit gemischten Portionszahlen
- **WHEN** an einem Tag Frühstück (effective=10, total=5000 kcal) und Mittag
  (effective=20, total=10000 kcal) liegen
- **THEN** die Pro-Person-Tagessumme SHALL `5000/10 + 10000/20 = 1000` kcal/Person betragen
  (nicht `15000/10` und nicht `15000/20`)

#### Scenario: Cost Summary cost_per_person je Mahlzeit
- **WHEN** der Cost-Summary-Endpunkt cost_per_person für einen Plan mit override-Mahlzeiten
  berechnet
- **THEN** cost_per_person SHALL die Summe der je-Mahlzeit-Pro-Person-Kosten sein
