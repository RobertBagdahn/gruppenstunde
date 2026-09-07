## MODIFIED Requirements

### Requirement: Automatische norm_portions-Berechnung

Das System SHALL `meal_plan.norm_portions` automatisch über `calculate_group_norm_factor()` aus allen GroupMembers neu berechnen, sobald ein GroupMember erstellt, aktualisiert oder gelöscht wird und kein manueller Override aktiv ist.

#### Scenario: Norm-Portionen werden aus GroupMembers berechnet
- **GIVEN** ein MealPlan mit `activity_factor=1.5` und zwei GroupMembers:
  - Person A: age=14, gender=male → Norm-Faktor ~0.95
  - Person B: age=14, gender=female → Norm-Faktor ~0.85
- **WHEN** die Berechnung ausgelöst wird
- **THEN** SHALL `meal_plan.norm_portions = round(0.95 + 0.85, 3)` sein (ca. 1.8)
- **AND** der alte manuelle Wert SHALL in `previous_norm_portions` gespeichert werden

#### Scenario: Keine GroupMembers → manueller Wert
- **GIVEN** ein MealPlan ohne GroupMembers
- **WHEN** `norm_portions` abgefragt wird
- **THEN** SHALL der zuletzt manuell gesetzte Wert verwendet werden (oder Default 10)

#### Scenario: Alle GroupMembers gelöscht → Fallback
- **GIVEN** ein MealPlan mit GroupMembers und `previous_norm_portions=10`
- **WHEN** der letzte GroupMember gelöscht wird
- **THEN** SHALL `norm_portions` auf 10 zurückfallen

### Requirement: Event-Teilnehmer synchronisieren

Das System SHALL einen Endpunkt `POST /api/meal-plans/{meal_plan_id}/sync-event-participants/` bereitstellen, der alle Participants des verknüpften Events idempotent als GroupMembers synchronisiert.

#### Scenario: Sync mit Event-Teilnehmern
- **GIVEN** ein MealPlan mit einem verknüpften Event und 3 Participants
- **WHEN** `POST /api/meal-plans/{meal_plan_id}/sync-event-participants/` aufgerufen wird
- **THEN** SHALL alle zuvor event-synchronisierten GroupMembers ersetzt werden
- **AND** SHALL 3 neue GroupMembers mit dem aktuellen Participant-Stand erstellt werden
- **AND** SHALL manuell gepflegte GroupMembers erhalten bleiben

#### Scenario: Wiederholter Sync ist idempotent
- **GIVEN** ein MealPlan mit einem Event und einem Participant
- **WHEN** der Sync zweimal ohne Änderung der Participants aufgerufen wird
- **THEN** SHALL der Plan genau einen event-synchronisierten GroupMember für diesen Participant enthalten

#### Scenario: Entfernte Event-Teilnehmer verschwinden
- **GIVEN** ein synchronisierter GroupMember für einen Participant, der nicht mehr am Event teilnimmt
- **WHEN** der Sync aufgerufen wird
- **THEN** SHALL der veraltete synchronisierte GroupMember gelöscht werden
