# meal-plan-effective-portions Specification Delta

## ADDED Requirements

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
