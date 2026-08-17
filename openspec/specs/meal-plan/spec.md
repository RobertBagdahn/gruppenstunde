# meal-plan Specification

## Purpose

Grundmodell, API-Verträge und Berechtigungsfelder für Essenspläne.

## Requirements

### Requirement: norm_portions aus GroupMembers

Das System SHALL `norm_portions` aus den Norm-Faktoren aller `MealPlanGroupMember`s berechnen,
sobald Mitglieder vorhanden sind. Der letzte manuelle Wert wird in
`previous_norm_portions` gesichert und nach dem Löschen aller Mitglieder wiederhergestellt.
`norm_portions` SHALL ein Float sein.

#### Scenario: Normportionen aktualisieren
- **WHEN** GroupMembers vorhanden sind
- **THEN** entspricht `norm_portions` ihrer Normfaktor-Summe

### Requirement: activity_factor am MealPlan

Das `MealPlan`-Modell SHALL ein Float-Feld `activity_factor` mit Default `1.5` bereitstellen,
es in Detail-Responses ausgeben und per Update änderbar machen. Bei vorhandenen GroupMembers
ist `norm_portions` danach neu zu berechnen.

#### Scenario: Aktivitätsfaktor ändern
- **WHEN** ein Nutzer `activity_factor` aktualisiert
- **THEN** wird der Wert gespeichert und die Normportionen werden neu berechnet

### Requirement: Berechnungsgrundlage

Kosten-, Nährwert-, Einkaufslisten- und Kochplanregeln SHALL die zentrale Definition von
`effective_portions` und die gemeinsame Item-/Override-Auflösung. Sie sind in
`meal-plan-effective-portions`, `meal-item-overrides` und den jeweiligen Ausgabespecs definiert.

#### Scenario: Gemeinsame Berechnung
- **WHEN** eine Food-Ausgabe Mengen berechnet
- **THEN** verwendet sie `effective_portions` und die zentrale Item-Auflösung

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
