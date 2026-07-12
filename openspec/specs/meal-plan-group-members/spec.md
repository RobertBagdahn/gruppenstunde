# meal-plan-group-members Specification

## Purpose

Verwaltung von Gruppenmitgliedern (Personen) an einem MealPlan zur automatischen Berechnung der Norm-Portionen aus Alter, Geschlecht und PAL über die Mifflin-St Jeor Formel.

## Requirements

### Requirement: GroupMember CRUD

Das System SHALL CRUD-Operationen für `MealPlanGroupMember` unter `/api/meal-plans/{meal_plan_id}/group-members/` bereitstellen. Jeder GroupMember hat `name` (optionaler String), `age` (Integer, Pflicht), `gender` ("male"/"female"/"no_answer", Default "no_answer"), `nutritional_tag_ids` (Liste von Integers, optional), und `person_id` (optionaler Link zu `event.Person`).

#### Scenario: GroupMember erstellen

- **WHEN** der Nutzer POST `/api/meal-plans/{meal_plan_id}/group-members/` mit `{"age": 14, "gender": "female"}` sendet
- **THEN** SHALL ein neuer GroupMember mit `name=None`, `age=14`, `gender="female"` erstellt werden
- **AND** die Response SHALL den erstellten GroupMember als JSON zurückgeben
- **AND** `meal_plan.norm_portions` SHALL automatisch neu berechnet werden

#### Scenario: GroupMember mit Name und Allergien erstellen

- **WHEN** der Nutzer POST mit `{"name": "Anna", "age": 10, "gender": "female", "nutritional_tag_ids": [3, 7]}` sendet
- **THEN** SHALL der GroupMember mit Name, Alter, Geschlecht und verknüpften NutritionalTags erstellt werden

#### Scenario: Name ist Pflicht wenn NutritionalTags gesetzt sind

- **WHEN** der Nutzer POST mit `{"age": 12, "gender": "no_answer", "nutritional_tag_ids": [1]}` sendet (kein Name)
- **THEN** SHALL das System mit 400 und Fehlermeldung "Name ist erforderlich, wenn Allergien oder Besonderheiten angegeben sind" antworten

#### Scenario: GroupMember ohne NutritionalTags ohne Name erstellen

- **WHEN** der Nutzer POST mit `{"age": 15, "gender": "male"}` sendet (kein Name, keine Tags)
- **THEN** SHALL der GroupMember erfolgreich mit `name=None` erstellt werden

#### Scenario: GroupMember löschen

- **WHEN** der Nutzer DELETE `/api/meal-plans/{meal_plan_id}/group-members/{member_id}/` sendet
- **THEN** SHALL der GroupMember gelöscht werden
- **AND** `meal_plan.norm_portions` SHALL automatisch neu berechnet werden

#### Scenario: GroupMember aktualisieren

- **WHEN** der Nutzer PATCH `/api/meal-plans/{meal_plan_id}/group-members/{member_id}/` mit `{"age": 16}` sendet
- **THEN** SHALL das Alter des GroupMembers auf 16 aktualisiert werden
- **AND** `meal_plan.norm_portions` SHALL automatisch neu berechnet werden

### Requirement: GroupMember-Liste im MealPlan-Detail

Das System SHALL die GroupMembers eines MealPlans in der Detail-Response (`GET /api/meal-plans/{id}/`) unter dem Feld `group_members` als Liste von `GroupMemberOut`-Objekten zurückgeben.

#### Scenario: MealPlan-Detail enthält GroupMembers

- **WHEN** der Nutzer `GET /api/meal-plans/{id}/` aufruft
- **THEN** SHALL die Response ein `group_members`-Array enthalten
- **AND** jedes Element SHALL `id`, `name`, `age`, `gender`, `nutritional_tags`, und `person_id` enthalten

### Requirement: Automatische norm_portions-Berechnung

Das System SHALL `meal_plan.norm_portions` automatisch über `calculate_group_norm_factor()` aus allen GroupMembers neu berechnen, sobald ein GroupMember erstellt, aktualisiert oder gelöscht wird.

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

### Requirement: Geschlecht "keine Angabe" berechnet Mittelwert

Das System SHALL für GroupMembers mit `gender="no_answer"` den Norm-Faktor als arithmetischen Mittelwert der männlichen und weiblichen Berechnung ermitteln.

#### Scenario: no_answer berechnet Mittelwert

- **GIVEN** ein GroupMember mit age=14, gender="no_answer", PAL=1.5
- **AND** der männliche Norm-Faktor für 14/PAL1.5 ist 0.95
- **AND** der weibliche Norm-Faktor ist 0.85
- **WHEN** die Norm-Faktor-Berechnung ausgeführt wird
- **THEN** SHALL der resultierende Norm-Faktor `(0.95 + 0.85) / 2 = 0.9` sein

### Requirement: activity_factor am MealPlan

Das System SHALL ein `activity_factor` FloatField am `MealPlan` bereitstellen (Default: 1.5). Dieser Wert wird an `calculate_group_norm_factor()` als PAL für alle GroupMembers übergeben.

#### Scenario: activity_factor wird bei Norm-Berechnung verwendet

- **GIVEN** ein MealPlan mit `activity_factor=2.0` und einem GroupMember (age=15, gender=male)
- **WHEN** die Norm-Portionen berechnet werden
- **THEN** SHALL der PAL-Wert 2.0 in die `PersonSpec` einfließen

#### Scenario: activity_factor im SettingsPanel editierbar

- **WHEN** der Nutzer PATCH `/api/meal-plans/{id}/` mit `{"activity_factor": 1.75}` sendet
- **THEN** SHALL `activity_factor` auf 1.75 gesetzt werden
- **AND** die Norm-Portionen SHALL mit dem neuen PAL-Wert neu berechnet werden

### Requirement: Stufen-Schnellhinzufügen

Das System SHALL einen Endpunkt `POST /api/meal-plans/{meal_plan_id}/group-members/bulk/` bereitstellen, der mehrere GroupMembers mit gleichem Default-Alter auf einmal anlegt.

#### Scenario: 5 Wölflinge auf einmal hinzufügen

- **WHEN** der Nutzer POST `/api/meal-plans/{id}/group-members/bulk/` mit `{"count": 5, "default_age": 8, "gender": "no_answer"}` sendet
- **THEN** SHALL 5 GroupMembers mit age=8 und gender="no_answer" erstellt werden
- **AND** die Response SHALL eine Liste der erstellten GroupMembers zurückgeben
- **AND** `meal_plan.norm_portions` SHALL einmalig (nach allen Inserts) neu berechnet werden

#### Scenario: Default-Alter pro Stufe

- **WHEN** der Nutzer Bulk mit `{"stufe": "woelflinge"}` sendet
- **THEN** SHALL das System automatisch `default_age=8` verwenden
- **AND** die unterstützten Stufen SHALL sein: `woelflinge` (8), `jungpfadfinder` (11), `pfadfinder` (14), `rover` (18)

### Requirement: Event-Teilnehmer synchronisieren

Das System SHALL einen Endpunkt `POST /api/meal-plans/{meal_plan_id}/sync-event-participants/` bereitstellen, der alle Participants des verknüpften Events als GroupMembers synchronisiert.

#### Scenario: Sync mit Event-Teilnehmern

- **GIVEN** ein MealPlan mit `event_id=5` und 3 Participants:
  - P1: Anna, Alter 10, weiblich, Tags=[3]
  - P2: Ben, Alter 14, männlich, Tags=[]
  - P3: Clara, Alter 12, weiblich, Tags=[7]
- **WHEN** `POST /api/meal-plans/{id}/sync-event-participants/` aufgerufen wird
- **THEN** SHALL alle bestehenden manuellen GroupMembers gelöscht werden
- **AND** 3 neue GroupMembers mit den Daten der Participants erstellt werden
- **AND** `norm_portions` SHALL neu berechnet werden

#### Scenario: Sync ohne verknüpftes Event

- **WHEN** `POST /api/meal-plans/{id}/sync-event-participants/` aufgerufen wird und `meal_plan.event` ist None
- **THEN** SHALL das System mit 400 und "Kein Event mit diesem Essensplan verknüpft" antworten

#### Scenario: Sync speichert person_id

- **GIVEN** ein Participant mit `person_id=42`
- **WHEN** synchronisiert wird
- **THEN** SHALL der erstellte GroupMember `person_id=42` haben

### Requirement: Auth-Prüfung für GroupMember-Endpunkte

Das System SHALL nur Nutzern mit Bearbeitungsrecht (`meal_plan.can_edit`) Zugriff auf GroupMember-Endpunkte gewähren.

#### Scenario: Nicht-authentifizierter Zugriff

- **WHEN** ein nicht authentifizierter Nutzer einen GroupMember-Endpunkt aufruft
- **THEN** SHALL das System mit 401 antworten

#### Scenario: Kein Bearbeitungsrecht

- **WHEN** ein Nutzer ohne Bearbeitungsrecht (nicht Owner, nicht Collaborator mit Editor/Admin-Rechten) einen GroupMember-Endpunkt aufruft
- **THEN** SHALL das System mit 403 antworten

### Requirement: NutritionalTag-Autocomplete

Das System SHALL den bestehenden Endpunkt `GET /api/nutritional-tags/` für das Autocomplete der Allergien-Eingabe nutzen. Der Query-Parameter `?search=` filtert Tags nach Namen.

#### Scenario: Autocomplete-Suche nach "nuss"

- **WHEN** der Nutzer im Frontend "nuss" in das Allergien-Feld tippt
- **THEN** SHALL das Frontend `GET /api/nutritional-tags/?search=nuss` aufrufen
- **AND** das Backend SHALL passende NutritionalTags zurückgeben (z.B. "Nüsse", "Nussfrei")
