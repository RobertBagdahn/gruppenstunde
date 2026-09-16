# meal-plan Specification

## Purpose

Grundmodell, API-Verträge und Berechtigungsfelder für Essenspläne.
## Requirements
### Requirement: norm_portions aus GroupMembers

Das System SHALL `norm_portions` aus den Norm-Faktoren aller `MealPlanGroupMember`s berechnen,
sobald Mitglieder vorhanden sind und kein manueller Normportionen-Override aktiv ist. Beim
Aktivieren des manuellen Overrides SHALL der vorherige automatische oder direkte Wert in
`previous_norm_portions` gesichert werden. Beim Deaktivieren SHALL der Wert aus den aktuellen
GroupMembers berechnet werden; ohne GroupMembers SHALL `previous_norm_portions` verwendet werden.
Bei aktivem `norm_portions_manual`-Override SHALL der gespeicherte manuelle Wert unverändert bleiben.
`norm_portions` SHALL ein Float sein.

#### Scenario: Normportionen aktualisieren
- **WHEN** GroupMembers vorhanden sind und kein manueller Override aktiv ist
- **THEN** entspricht `norm_portions` ihrer Normfaktor-Summe

#### Scenario: Manuelle Normportionen ohne GroupMembers zurücksetzen
- **WHEN** ein manueller Wert gesetzt, der Override deaktiviert und kein GroupMember vorhanden ist
- **THEN** wird `norm_portions` auf `previous_norm_portions` zurückgesetzt

#### Scenario: Manuelle Normportionen bewahren
- **WHEN** GroupMembers hinzugefügt, geändert, gelöscht oder synchronisiert werden und der manuelle Override aktiv ist
- **THEN** bleibt `norm_portions` auf dem gespeicherten manuellen Wert

### Requirement: activity_factor am MealPlan

Das `MealPlan`-Modell SHALL ein Float-Feld `activity_factor` mit Default `1.5` bereitstellen,
es in Detail-Responses ausgeben und per Update änderbar machen. Bei vorhandenen GroupMembers
ist `norm_portions` danach neu zu berechnen, sofern kein manueller Normportionen-Override aktiv ist
und der Plan seine Normportionen automatisch aus GroupMembers bezieht.

#### Scenario: Aktivitätsfaktor ändern
- **WHEN** ein Nutzer `activity_factor` aktualisiert
- **THEN** wird der Wert gespeichert
- **AND** automatische bzw. gruppenbasierte Normportionen werden mit dem neuen PAL neu berechnet
- **AND** ein standalone direkter Normportionenwert bleibt unverändert

#### Scenario: Aktivitätsfaktor bei manuellem Override ändern
- **WHEN** ein Nutzer `activity_factor` aktualisiert und `norm_portions_manual` aktiv ist
- **THEN** wird der Aktivitätsfaktor gespeichert
- **AND** der manuelle `norm_portions`-Wert bleibt unverändert

### Requirement: Berechnungsgrundlage

Kosten-, Nährwert-, Einkaufslisten- und Kochplanregeln SHALL die zentrale Definition von
`effective_portions` und die gemeinsame Item-/Override-Auflösung verwenden.
Template-Mahlzeiten mit `is_reference=True` (`RefMeal`) SHALL von allen realen Berechnungen
(Einkaufsliste `generate_shopping_list`, `nutrition_summary`, Kosten und Gesamtplan-Cockpit `_aggregate_meal_plan_values`)
vollständig ausgeschlossen werden.
Direkte Zutaten (`MealItem.ingredient`) SHALL in allen Berechnungen und PDF-Exporten mit `item.factor * effective_portions` skaliert werden.

#### Scenario: Gemeinsame Berechnung
- **WHEN** eine Food-Ausgabe Mengen berechnet
- **THEN** verwendet sie `effective_portions` und die zentrale Item-Auflösung

#### Scenario: RefMeal Isolation in Einkaufsliste
- **WHEN** eine Einkaufsliste für einen MealPlan mit 7 realen Mahlzeiten und 1 RefMeal-Vorlage generiert wird
- **THEN** fließen ausschließlich die Zutaten der 7 realen Mahlzeiten in die Einkaufsliste ein
- **AND** die RefMeal-Vorlage wird nicht als zusätzlicher 8. Tag eingerechnet

#### Scenario: RefMeal Isolation in Nährwert-Summary
- **WHEN** die Gesamtplan-Nährwertübersicht abgerufen wird
- **THEN** werden Mahlzeiten mit `is_reference=True` ignoriert

### Requirement: List schema exposes permissions

Jedes MealPlan-Listenelement SHALL serverseitig aufgelöste `can_edit: bool` und
`can_delete: bool` neben `is_owner` enthalten.

#### Scenario: Berechtigungen im Listenelement
- **WHEN** ein Nutzer seine MealPlan-Liste abruft
- **THEN** enthält jedes Element beide serverseitig berechneten Felder

### Requirement: MealItem exposes recipe image

`MealItemOut` und `CookingScheduleRecipeBlockOut` SHALL das Rezeptbild als `image_url` (`string | null`)
ausgeben. Interne PDF-Datenstrukturen verwenden denselben Namen.

#### Scenario: Rezeptbild im MealItem
- **WHEN** ein MealItem serialisiert wird
- **THEN** heißt das Bildfeld `image_url` und ist bei fehlendem Bild `null`

### Requirement: Meal-plan core flows are covered by browser regression tests
The Food E2E suite SHALL verify MealPlan creation, settings updates, default meal times, manual norm portions, and deletion using authenticated isolated data.

#### Scenario: Empty meal plan creation roundtrip
- **WHEN** an authenticated user creates an empty MealPlan with a fixed name, date range, and portions
- **THEN** the plan detail URL SHALL open, the plan name and portions SHALL be visible, and reload SHALL preserve the values

#### Scenario: Custom meal times drive new meals
- **WHEN** a user configures custom default meal times and creates a plan
- **THEN** newly added meals SHALL use those configured start and end times

#### Scenario: Manual event norm portions remain stable
- **WHEN** an event-linked plan is switched to manual norm portions and saved
- **THEN** the value SHALL remain unchanged after settings reload and participant/activity changes until automatic mode is restored

#### Scenario: Standalone plans do not expose event-only manual mode
- **WHEN** a standalone MealPlan settings dialog is opened
- **THEN** event-only manual norm-portion controls SHALL not be shown

### Requirement: Local-First Meal Edits
Edits performed on any scheduled meal (e.g., modifying recipes, portions, or ingredient overrides) SHALL apply exclusively to that specific scheduled meal instance by default and MUST NOT modify any shared reference meal or template without explicit user action.

#### Scenario: Editing scheduled meal instance
- **WHEN** user updates a recipe or ingredient quantity in a Tuesday breakfast slot
- **THEN** only the Tuesday breakfast meal record is updated in the database
- **AND** other breakfast slots and reference meals remain unaffected

### Requirement: Default Empty Slots on Plan Creation
When a meal plan is created with a start and end date, the system SHALL automatically generate empty standard meal slots (Breakfast, Lunch, Dinner) for each day within the range.

#### Scenario: Auto-generating empty meal slots on creation
- **WHEN** user creates a meal plan spanning 3 days
- **THEN** system initializes the plan with Breakfast, Lunch, and Dinner slots for each of the 3 days in pending status

### Requirement: Kostenübersicht mit Preisabdeckung
Meal-Plan-Kosten SHALL nur bestätigte positive Zutatenpreise verwenden und die Preisabdeckung über alle aktiven Zutaten transparent ausgeben.

#### Scenario: KI-Preis noch ausstehend
- **WHEN** eine Zutat nur einen pending KI-Preisvorschlag besitzt
- **THEN** SHALL sie als unbepreist gelten
- **THEN** SHALL der Meal-Plan keinen unbestätigten Preis in Summen verwenden

#### Scenario: Preis nach Bestätigung
- **WHEN** der Preisvorschlag bestätigt wurde
- **THEN** SHALL die Kostenberechnung den globalen Preis verwenden
- **THEN** SHALL die Preisabdeckung aktualisiert erscheinen
