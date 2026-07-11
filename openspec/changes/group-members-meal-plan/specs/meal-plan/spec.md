# meal-plan Specification Delta

## ADDED Requirements

### Requirement: norm_portions wird aus GroupMembers automatisch abgeleitet

Das System SHALL `meal_plan.norm_portions` aus der Summe der Norm-Faktoren aller `MealPlanGroupMember`s berechnen, sobald mindestens ein GroupMember existiert. Der bisherige manuelle Wert wird in `previous_norm_portions` gesichert und beim Löschen aller GroupMembers wiederhergestellt.

`norm_portions` ist ab dieser Änderung ein `FloatField` (vorher `IntegerField`), da Gruppensummen selten ganzzahlig sind.

#### Scenario: GroupMembers vorhanden → automatische Berechnung

- **GIVEN** ein MealPlan mit 3 GroupMembers (Summe der Norm-Faktoren = 3.7)
- **WHEN** `meal_plan.norm_portions` abgefragt wird
- **THEN** SHALL `norm_portions = 3.7` sein
- **AND** `previous_norm_portions` SHALL den letzten manuellen Wert enthalten

#### Scenario: Keine GroupMembers → manueller Wert

- **GIVEN** ein MealPlan ohne GroupMembers und `norm_portions=10` (manuell gesetzt)
- **WHEN** `meal_plan.norm_portions` abgefragt wird
- **THEN** SHALL `norm_portions = 10` sein (manueller Wert)

#### Scenario: norm_portions ist FloatField

- **WHEN** `meal_plan.norm_portions` in der Datenbank gespeichert wird
- **THEN** SHALL der Wert ein Float sein (z.B. 3.7, nicht auf 4 gerundet)

### Requirement: activity_factor am MealPlan

Das System SHALL ein `activity_factor` FloatField (Default: 1.5) am `MealPlan`-Modell bereitstellen. Dieser Wert dient als PAL für alle GroupMember-Berechnungen.

#### Scenario: activity_factor Default

- **WHEN** ein neuer MealPlan erstellt wird
- **THEN** SHALL `activity_factor` den Default-Wert 1.5 haben

#### Scenario: activity_factor in MealPlanDetailOut

- **WHEN** `GET /api/meal-plans/{id}/` aufgerufen wird
- **THEN** SHALL die Response `activity_factor` enthalten

#### Scenario: activity_factor in MealPlanUpdateIn

- **WHEN** der Nutzer PATCH `/api/meal-plans/{id}/` mit `{"activity_factor": 1.75}` sendet
- **THEN** SHALL `activity_factor` auf 1.75 aktualisiert werden
- **AND** falls GroupMembers existieren, SHALL `norm_portions` mit dem neuen PAL neu berechnet werden
