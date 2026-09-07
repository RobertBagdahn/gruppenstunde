## MODIFIED Requirements

### Requirement: norm_portions aus GroupMembers

Das System SHALL `norm_portions` aus den Norm-Faktoren aller `MealPlanGroupMember`s berechnen,
sobald Mitglieder vorhanden sind und kein manueller Normportionen-Override aktiv ist. Beim Aktivieren des manuellen Overrides SHALL der vorherige automatische oder direkte Wert in `previous_norm_portions` gesichert werden. Beim Deaktivieren SHALL der Wert aus den aktuellen GroupMembers berechnet werden; ohne GroupMembers SHALL `previous_norm_portions` verwendet werden.
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
ist `norm_portions` danach neu zu berechnen, sofern kein manueller Normportionen-Override aktiv ist und der Plan seine Normportionen automatisch aus GroupMembers bezieht.

#### Scenario: Aktivitätsfaktor ändern
- **WHEN** ein Nutzer `activity_factor` aktualisiert
- **THEN** wird der Wert gespeichert
- **AND** automatische bzw. gruppenbasierte Normportionen werden mit dem neuen PAL neu berechnet
- **AND** ein standalone direkter Normportionenwert bleibt unverändert
