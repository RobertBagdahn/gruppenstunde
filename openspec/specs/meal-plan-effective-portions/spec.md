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
`override_portions` gesetzt hat. Das gilt für Mengen-, Energie-, Kosten-, Einkaufslisten- und
Kochplanberechnungen.

#### Scenario: Energie nutzt override_portions
- **WHEN** ein Plan `norm_portions = 10` hat und eine Mahlzeit `override_portions = 20`
  mit einem Rezept (`portions=1`, `cached_energy_total_kcal=2000`, factor=1.0)
- **THEN** `MealOut.total_energy_kcal` SHALL `2000 × 1.0 × (20/1) = 40000` kcal betragen
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

#### Scenario: Cost Summary cost_per_person als gewichtetes Mittel
- **WHEN** der Cost-Summary-Endpunkt cost_per_person für einen Plan mit override-Mahlzeiten
  berechnet
- **THEN** `cost_per_person` SHALL `Summe(recipe_cost_in_meal) / Summe(effective_portions)` sein

#### Scenario: Alle Ausgabewege verwenden effektive Portionen
- **WHEN** eine Mahlzeit `override_portions` gesetzt hat
- **THEN** verwenden Mengen, Energie, Kosten, Einkaufsliste und Kochplan diese effektive Portionszahl

### Requirement: effektive Portionen mit Float-norm_portions

Das System SHALL `effective_portions` weiterhin als `override_portions or norm_portions` definieren. Da `norm_portions` jetzt ein `FloatField` sein kann (durch GroupMember-Berechnung), SHALL `effective_portions` ebenfalls Float-Werte unterstützen. Bestehende Rundungslogik (z.B. für Shopping-Listen) SHALL weiterhin funktionieren.

#### Scenario: effective_portions mit Float-norm_portions

- **GIVEN** ein MealPlan mit `norm_portions=3.7` (berechnet aus GroupMembers) und einer Mahlzeit ohne `override_portions`
- **WHEN** `effective_portions` abgefragt wird
- **THEN** SHALL `effective_portions = 3.7` sein

#### Scenario: effective_portions mit override und Float-norm_portions

- **GIVEN** ein MealPlan mit `norm_portions=3.7` und einer Mahlzeit mit `override_portions=20`
- **WHEN** `effective_portions` abgefragt wird
- **THEN** SHALL `effective_portions = 20` sein (override hat Vorrang)

### Requirement: Tagesgenaue Portionen (Phase 2 Vorbereitung)

Das System SHALL in Phase 1 `norm_portions` als plan-weiten Float-Wert aus allen GroupMembers berechnen. Die Infrastruktur für tagesgenaue Portionen (pro Tag basierend auf BookingOption-Präsenz) wird in den GroupMember-Daten (`date_ranges` JSON-Feld, `synced_from_event` Boolean) vorbereitet, aber noch nicht in der `effective_portions`-Berechnung genutzt.

#### Scenario: Phase 1 — alle GroupMembers zählen für jeden Tag

- **GIVEN** einen MealPlan mit GroupMembers über 3 Tage
- **WHEN** `effective_portions` für eine Mahlzeit an Tag 2 berechnet wird
- **THEN** SHALL `norm_portions` der plan-weite Wert aus ALLEN GroupMembers sein
- **AND** keine tagesgenaue Filterung stattfinden (Phase 2)
